import "server-only";

import { randomUUID } from "crypto";
import { crmFetch } from "@/lib/crm/client";
import { env } from "@/lib/env";
import { getTwentyMetadataUrl } from "@/lib/crm/twentyAuth";
import {
  getVisitPhotoLedgerEntry,
  setVisitPhotoLedgerEntry,
} from "@/lib/server/visitPhotoLedger";
import { isJpegBytes, validateVisitPhotoByteSize } from "@/lib/visits/visitPhoto";

let cachedAttachmentFileFieldId: string | null = null;

type MetadataGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

async function metadataFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const metadataUrl = getTwentyMetadataUrl();
  const response = await fetch(metadataUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TWENTY_API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`Falha de ligação ao CRM (metadados HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as MetadataGraphqlResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || "Erro nos metadados do CRM.");
  }
  if (!payload.data) {
    throw new Error("Resposta inválida do CRM.");
  }
  return payload.data;
}

async function resolveAttachmentFileFieldMetadataId(): Promise<string> {
  const envOverride = process.env.TWENTY_ATTACHMENT_FILE_FIELD_ID?.trim();
  if (envOverride) return envOverride;
  if (cachedAttachmentFileFieldId) return cachedAttachmentFileFieldId;

  const data = await metadataFetch<{
    objects: {
      edges: Array<{
        node: {
          nameSingular?: string;
          fieldsList?: Array<{ id?: string; name?: string; type?: string }>;
        };
      }>;
    };
  }>(
    `query AttachmentFileField {
      objects(paging: { first: 200 }) {
        edges {
          node {
            nameSingular
            fieldsList { id name type }
          }
        }
      }
    }`,
    {}
  );

  const attachment = data.objects.edges.find(
    (edge) => edge.node.nameSingular === "attachment"
  )?.node;
  const fileField = attachment?.fieldsList?.find((field) => field.name === "file");
  const fieldId = fileField?.id?.trim();
  if (!fieldId) {
    throw new Error("Campo de ficheiro dos anexos não encontrado no CRM.");
  }

  cachedAttachmentFileFieldId = fieldId;
  return fieldId;
}

async function createFileUpload(
  filename: string,
  size: number,
  fieldMetadataId: string
): Promise<{ fileId: string; uploadUrl: string; contentType: string }> {
  const data = await metadataFetch<{
    createFileUpload: {
      fileId: string;
      uploadUrl: string;
      contentType: string;
    };
  }>(
    `mutation CreateVisitPhotoUpload(
      $filename: String!
      $size: Float!
      $fileFolder: FileFolder!
      $fieldMetadataId: String
    ) {
      createFileUpload(
        filename: $filename
        size: $size
        fileFolder: $fileFolder
        fieldMetadataId: $fieldMetadataId
      ) {
        fileId
        uploadUrl
        contentType
      }
    }`,
    {
      filename,
      size,
      fileFolder: "FilesField",
      fieldMetadataId,
    }
  );

  const target = data.createFileUpload;
  if (!target?.fileId || !target.uploadUrl) {
    throw new Error("O CRM não devolveu destino de upload.");
  }
  return target;
}

async function completeFileUpload(fileId: string): Promise<void> {
  await metadataFetch<{ completeFileUpload: { id: string } }>(
    `mutation CompleteVisitPhotoUpload($fileId: String!) {
      completeFileUpload(fileId: $fileId) { id }
    }`,
    { fileId }
  );
}

async function putFileBytes(uploadUrl: string, contentType: string, bytes: Uint8Array): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType || "image/jpeg" },
    body: Buffer.from(bytes),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error("Ficheiro demasiado grande para o servidor.");
    }
    throw new Error(`Falha ao enviar a foto (HTTP ${response.status}).`);
  }
}

async function createOpportunityAttachment(params: {
  opportunityId: string;
  filename: string;
  fileId: string;
  clientRequestId: string;
}): Promise<string> {
  const attachmentId = randomUUID();
  const displayName = params.filename;

  const result = await crmFetch<{
    createAttachment: { id: string };
  }>(
    `mutation CreateVisitPhotoAttachment($data: AttachmentCreateInput!) {
      createAttachment(data: $data) { id }
    }`,
    {
      data: {
        id: attachmentId,
        name: displayName,
        targetOpportunityId: params.opportunityId,
        file: [
          {
            fileId: params.fileId,
            label: `${displayName} [${params.clientRequestId.slice(0, 8)}]`,
          },
        ],
      },
    },
    { timeoutMs: 20_000, maxRetries: 0, idempotencyKey: `visit-photo-${params.clientRequestId}` }
  );

  const id = result.createAttachment?.id;
  if (!id) {
    throw new Error("Não foi possível criar o anexo no CRM.");
  }
  return id;
}

export async function uploadVisitPhotoAttachment(params: {
  opportunityId: string;
  filename: string;
  bytes: Uint8Array;
  clientRequestId: string;
}): Promise<{ attachmentId: string; fileId: string }> {
  const sizeError = validateVisitPhotoByteSize(params.bytes.byteLength);
  if (sizeError) {
    throw new Error(sizeError);
  }
  if (!isJpegBytes(params.bytes)) {
    throw new Error("Só são aceites fotos JPEG.");
  }

  const existing = await getVisitPhotoLedgerEntry(params.clientRequestId);
  if (existing?.attachmentId) {
    return {
      attachmentId: existing.attachmentId,
      fileId: existing.fileId || "",
    };
  }

  const fieldMetadataId = await resolveAttachmentFileFieldMetadataId();
  let fileId = existing?.fileId;

  try {
    if (!fileId) {
      const uploadTarget = await createFileUpload(
        params.filename,
        params.bytes.byteLength,
        fieldMetadataId
      );
      fileId = uploadTarget.fileId;
      await setVisitPhotoLedgerEntry(params.clientRequestId, { fileId });
      await putFileBytes(uploadTarget.uploadUrl, uploadTarget.contentType, params.bytes);
      await completeFileUpload(fileId);
    } else {
      try {
        await completeFileUpload(fileId);
      } catch {
        const uploadTarget = await createFileUpload(
          params.filename,
          params.bytes.byteLength,
          fieldMetadataId
        );
        fileId = uploadTarget.fileId;
        await setVisitPhotoLedgerEntry(params.clientRequestId, { fileId });
        await putFileBytes(uploadTarget.uploadUrl, uploadTarget.contentType, params.bytes);
        await completeFileUpload(fileId);
      }
    }
  } catch (error) {
    await setVisitPhotoLedgerEntry(params.clientRequestId, { fileId: undefined });
    const uploadTarget = await createFileUpload(
      params.filename,
      params.bytes.byteLength,
      fieldMetadataId
    );
    fileId = uploadTarget.fileId;
    await setVisitPhotoLedgerEntry(params.clientRequestId, { fileId });
    await putFileBytes(uploadTarget.uploadUrl, uploadTarget.contentType, params.bytes);
    await completeFileUpload(fileId);
    if (error instanceof Error) {
      console.warn("[visitFiles] Repetição de upload após falha:", error.message);
    }
  }

  const attachmentId = await createOpportunityAttachment({
    opportunityId: params.opportunityId,
    filename: params.filename,
    fileId,
    clientRequestId: params.clientRequestId,
  });

  await setVisitPhotoLedgerEntry(params.clientRequestId, { fileId, attachmentId });

  return { attachmentId, fileId };
}

type CrmAttachmentListNode = {
  id?: string | null;
  name?: string | null;
  createdAt?: string | null;
  file?: Array<{
    fileId?: string | null;
    extension?: string | null;
    url?: string | null;
  }> | null;
};

const OPPORTUNITY_ATTACHMENTS_QUERY = `query OpportunityAttachments($opportunityId: UUID!, $first: Int) {
  attachments(
    filter: { targetOpportunityId: { eq: $opportunityId } }
    orderBy: { createdAt: DescNullsLast }
    first: $first
  ) {
    edges {
      node {
        id
        name
        createdAt
        file { fileId extension url }
      }
    }
  }
}`;

const ATTACHMENT_FILE_QUERY = `query OpportunityAttachmentFile($attachmentId: UUID!) {
  attachments(filter: { id: { eq: $attachmentId } }, first: 1) {
    edges {
      node {
        id
        name
        targetOpportunityId
        file { fileId extension url }
      }
    }
  }
}`;

export async function fetchOpportunityAttachmentNodes(
  opportunityId: string,
  first = 80
): Promise<CrmAttachmentListNode[]> {
  const data = await crmFetch<{
    attachments: { edges: Array<{ node: CrmAttachmentListNode }> };
  }>(
    OPPORTUNITY_ATTACHMENTS_QUERY,
    { opportunityId, first },
    { timeoutMs: 20_000, maxRetries: 1 }
  );

  return data.attachments.edges.map((edge) => edge.node);
}

export type OpportunityAttachmentFileMeta = {
  attachmentId: string;
  opportunityId: string;
  name: string;
  extension: string;
  signedUrl: string;
};

export async function fetchOpportunityAttachmentFileMeta(
  opportunityId: string,
  attachmentId: string
): Promise<OpportunityAttachmentFileMeta | null> {
  const data = await crmFetch<{
    attachments: {
      edges: Array<{
        node: {
          id?: string | null;
          name?: string | null;
          targetOpportunityId?: string | null;
          file?: Array<{
            extension?: string | null;
            url?: string | null;
          }> | null;
        };
      }>;
    };
  }>(
    ATTACHMENT_FILE_QUERY,
    { attachmentId },
    { timeoutMs: 15_000, maxRetries: 1 }
  );

  const node = data.attachments.edges[0]?.node;
  const id = node?.id?.trim();
  const target = node?.targetOpportunityId?.trim();
  if (!id || !target || target !== opportunityId) {
    return null;
  }

  const fileMeta = node.file?.[0];
  const signedUrl = fileMeta?.url?.trim();
  if (!signedUrl) {
    return null;
  }

  const extension = (fileMeta?.extension ?? "bin").trim().toLowerCase().replace(/^\./, "") || "bin";
  const name = node.name?.trim() || `ficheiro.${extension}`;

  return {
    attachmentId: id,
    opportunityId: target,
    name,
    extension,
    signedUrl,
  };
}