import type { VisitServiceFileKind, VisitServiceFileListItem } from "@/lib/schemas/visitServiceFiles";

/** Copy curta para o técnico antes de abrir a lista (metadados já carregados). */
export function summarizeVisitServiceFileList(items: VisitServiceFileListItem[]): string {
  const images = items.filter((i) => i.kind === "image").length;
  const docs = items.filter((i) => i.kind === "file").length;
  if (images === 0 && docs === 0) {
    return "Sem ficheiros no CRM.";
  }
  const parts: string[] = [];
  if (images > 0) {
    parts.push(images === 1 ? "1 foto" : `${images} fotos`);
  }
  if (docs > 0) {
    parts.push(docs === 1 ? "1 documento" : `${docs} documentos`);
  }
  return `${parts.join(" e ")} no CRM.`;
}

export const VISIT_SERVICE_FILES_MAX = 40;

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "bmp",
  "avif",
]);

export type CrmOpportunityAttachmentNode = {
  id?: string | null;
  name?: string | null;
  createdAt?: string | null;
  file?: Array<{
    fileId?: string | null;
    extension?: string | null;
    url?: string | null;
  }> | null;
};

export function normalizeFileExtension(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim().toLowerCase().replace(/^\./, "");
  return trimmed || "bin";
}

export function visitServiceFileKindFromExtension(extension: string): VisitServiceFileKind {
  return IMAGE_EXTENSIONS.has(extension) ? "image" : "file";
}

export function mapCrmAttachmentToListItem(
  node: CrmOpportunityAttachmentNode
): VisitServiceFileListItem | null {
  const id = node.id?.trim();
  if (!id) return null;

  const fileMeta = node.file?.[0];
  const extension = normalizeFileExtension(fileMeta?.extension);
  const name = (node.name?.trim() || `Ficheiro.${extension}`).slice(0, 200);
  const createdAt = node.createdAt?.trim() || new Date(0).toISOString();

  return {
    id,
    name,
    extension,
    createdAt,
    kind: visitServiceFileKindFromExtension(extension),
  };
}

export function mapCrmAttachmentsToList(
  nodes: CrmOpportunityAttachmentNode[]
): VisitServiceFileListItem[] {
  const items = nodes
    .map(mapCrmAttachmentToListItem)
    .filter((item): item is VisitServiceFileListItem => item != null);

  items.sort((a, b) => {
    const ta = Date.parse(a.createdAt);
    const tb = Date.parse(b.createdAt);
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) {
      return tb - ta;
    }
    return b.id.localeCompare(a.id);
  });

  return items.slice(0, VISIT_SERVICE_FILES_MAX);
}

export function contentTypeForVisitFileExtension(extension: string): string {
  const ext = normalizeFileExtension(extension);
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    bmp: "image/bmp",
    avif: "image/avif",
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}