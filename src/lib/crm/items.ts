import "server-only";
import { crmFetch } from "./client";
import { CRM_OBJECTS, CRM_FIELDS, WAREHOUSE_STATUS } from "./contract";
import { mapServiceItemToProdutoCreateInput } from "./produtoItemInput";

export interface ServiceItem {
  opportunityId: string;
  product: string;
  width: number;
  height: number;
  qty: number;
  color?: string;
  location?: string;
  isPrepared: boolean;
  division?: string;
  fixation?: string;
  controls?: string;
  material?: string;
  materialOther?: string;
  model?: string;
  ralColor?: string;
  fabric?: string;
  reference?: string;
  activation?: string;
  productObservations?: string;
  measurementGroupId?: string;
  price?: number;
}

const { serviceItem: SI } = CRM_OBJECTS;

/**
 * Cria/atualiza produtos estruturados no Twenty CRM (objeto Produto / query produtos).
 */
export async function createServiceItems(items: ServiceItem[]): Promise<{ success: boolean; error?: string }> {
  if (items.length === 0) return { success: true };

  const opportunityId = items[0].opportunityId;

  try {
    const findQuery = `
      query findItems($oppId: UUID!) {
        ${SI.queryName}(filter: { servicoitemId: { eq: $oppId } }) {
          edges {
            node {
              id
              preparado
              estadoDoArmazem
            }
          }
        }
      }
    `;

    const existingData = await crmFetch<Record<string, { edges: Array<{ node: unknown }> }>>(
      findQuery,
      { oppId: opportunityId }
    );
    const existingNodes =
      existingData?.[SI.queryName]?.edges?.map((e) => e.node as {
        id: string;
        preparado?: boolean;
        estadoDoArmazem?: string[];
      }) || [];
    const hasPreparedItems = existingNodes.some(
      (node) =>
        node.preparado === true ||
        (Array.isArray(node.estadoDoArmazem) &&
          node.estadoDoArmazem.some(
            (s) => s === WAREHOUSE_STATUS.PREPARADO || s === WAREHOUSE_STATUS.PROBLEMAS
          ))
    );

    if (hasPreparedItems) {
      throw new Error(
        "Encomenda já em preparação no armazém. Contacte o armazém antes de alterar as medições."
      );
    }

    const existingIds = existingNodes.map((node) => node.id);

    if (existingIds.length > 0) {
      await Promise.all(
        existingIds.map((id: string) =>
          crmFetch(
            `mutation deleteItem($id: UUID!) { ${SI.mutationDelete}(id: $id) { id } }`,
            { id }
          )
        )
      );
    }

    const batchMutation = `
      mutation createItems($data: [${SI.createInputType}!]!) {
        ${SI.mutationCreateMany}(data: $data) {
          id
        }
      }
    `;

    const variables = {
      data: items.map((item) => mapServiceItemToProdutoCreateInput(item)),
    };

    await crmFetch(batchMutation, variables);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro na sincronização de produtos.";
    console.error("Erro na sincronização de produtos:", error);
    throw new Error(message);
  }
}

export async function updateItemPreparationStatus(
  itemId: string,
  isPrepared: boolean,
  estadoDoArmazem?: string
) {
  const { isMeasurementsDbConfigured } = await import("@/lib/measurements/db/client");
  const { updateLineWarehouseState } = await import("@/lib/measurements/repo");
  const enumVal =
    estadoDoArmazem || (isPrepared ? WAREHOUSE_STATUS.PREPARADO : WAREHOUSE_STATUS.EM_PREPARACAO);

  if (isMeasurementsDbConfigured() && itemId.length > 10) {
    await updateLineWarehouseState(itemId, isPrepared, enumVal);
    return { id: itemId, preparado: isPrepared, estadoDoArmazem: [enumVal] };
  }

  const mutation = `
    mutation updateItem($id: UUID!, $preparado: Boolean!, $estadoDoArmazem: [${SI.warehouseStateEnum}!]) {
      ${SI.mutationUpdate}(id: $id, data: { preparado: $preparado, estadoDoArmazem: $estadoDoArmazem }) {
        id
        preparado
        estadoDoArmazem
      }
    }
  `;
  return await crmFetch(mutation, {
    id: itemId,
    preparado: isPrepared,
    estadoDoArmazem: [enumVal],
  });
}

export async function fetchServiceItemsByOpportunity(opportunityId: string) {
  const F = CRM_FIELDS.serviceItem;
  const query = `
    query findItems($oppId: UUID!) {
      ${SI.queryName}(filter: { servicoitemId: { eq: $oppId } }) {
        edges {
          node {
            id
            ${F.product}
            ${F.width}
            ${F.height}
            ${F.quantity}
            ${F.color}
            ${F.location}
            ${F.prepared}
            ${F.division}
            ${F.fixation}
            ${F.controls}
            ${F.material}
            ${F.materialOther}
            ${F.model}
            ${F.ralColor}
            ${F.fabric}
            ${F.reference}
            ${F.activation}
            ${F.productObservations}
            ${F.measurementGroupId}
            ${F.price}
          }
        }
      }
    }
  `;
  const data = await crmFetch<Record<string, { edges: Array<{ node: unknown }> }>>(query, {
    oppId: opportunityId,
  });
  return data?.[SI.queryName]?.edges?.map((e) => e.node) || [];
}
