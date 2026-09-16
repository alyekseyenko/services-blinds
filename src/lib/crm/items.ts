"use server";
import { crmFetch } from './client';
import { WAREHOUSE_STATUS } from './contract';

export interface ServiceItem {
  opportunityId: string;
  product: string;
  width: number;
  height: number;
  qty: number;
  color?: string;
  location?: string;
  activation?: string;
  material?: string;
  fabric?: string;
  reference?: string;
  fixation?: string;
  controls?: string;
  isPrepared: boolean;
}

/**
 * Tentativa de criar itens de serviço estruturados no Twenty CRM.
 * Esta função é desenhada para falhar silenciosamente se o objeto ainda não existir,
 * garantindo que a App não bloqueia durante a transição.
 */
export async function createServiceItems(items: ServiceItem[]): Promise<{ success: boolean; error?: string }> {
  if (items.length === 0) return { success: true };

  const opportunityId = items[0].opportunityId;

  try {
    const findQuery = `
      query findItems($oppId: UUID!) {
        itemdeservicos(filter: { servicoitemId: { eq: $oppId } }) {
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

    const existingData = await crmFetch<any>(findQuery, { oppId: opportunityId });
    const existingNodes = existingData?.itemdeservicos?.edges?.map((e: any) => e.node) || [];
    const hasPreparedItems = existingNodes.some(
      (node: { preparado?: boolean; estadoDoArmazem?: string[] }) =>
        node.preparado === true ||
        (Array.isArray(node.estadoDoArmazem) &&
          node.estadoDoArmazem.some((s) => s === WAREHOUSE_STATUS.PREPARADO || s === WAREHOUSE_STATUS.PROBLEMAS))
    );

    if (hasPreparedItems) {
      throw new Error(
        "Encomenda já em preparação no armazém. Contacte o armazém antes de alterar as medições."
      );
    }

    const existingIds = existingNodes.map((node: { id: string }) => node.id);

    if (existingIds.length > 0) {
      console.log(`🗑️ Limpando ${existingIds.length} itens antigos em paralelo...`);
      await Promise.all(
        existingIds.map((id: string) =>
          crmFetch(`mutation deleteItem($id: UUID!) { deleteItemdeservico(id: $id) { id } }`, { id })
        )
      );
    }

    // 2. CRIAÇÃO: Mutação em lote para alta performance
    const batchMutation = `
      mutation createItems($data: [ItemdeservicoCreateInput!]!) {
        createItemdeservicos(data: $data) {
          id
        }
      }
    `;

    const variables = {
      data: items.map(item => ({
        servicoitemId: item.opportunityId,
        produto: item.product,
        largura: item.width,
        altura: item.height,
        quantidade: item.qty,
        cor: item.color,
        localizacao: item.location,
        preparado: item.isPrepared,
        name: `${item.product} - ${item.location?.split(' | ')[0] || 'Geral'}`
      }))
    };

    await crmFetch(batchMutation, variables);
    console.log(`✅ ${items.length} itens novos criados com sucesso.`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro na sincronização de itens.";
    console.error("Erro na sincronização de Itens de Serviço:", error);
    throw new Error(message);
  }
}

export async function updateItemPreparationStatus(itemId: string, isPrepared: boolean, estadoDoArmazem?: string) {
  const mutation = `
    mutation updateItem($id: UUID!, $preparado: Boolean!, $estadoDoArmazem: [ItemdeservicoEstadoDoArmazemEnum!]) {
      updateItemdeservico(id: $id, data: { preparado: $preparado, estadoDoArmazem: $estadoDoArmazem }) {
        id
        preparado
        estadoDoArmazem
      }
    }
  `;
  const enumVal = estadoDoArmazem || (isPrepared ? WAREHOUSE_STATUS.PREPARADO : WAREHOUSE_STATUS.EM_PREPARACAO);
  return await crmFetch(mutation, { 
    id: itemId, 
    preparado: isPrepared, 
    estadoDoArmazem: [enumVal] 
  });
}

export async function fetchServiceItemsByOpportunity(opportunityId: string) {
  const query = `
    query findItems($oppId: UUID!) {
      itemdeservicos(filter: { servicoitemId: { eq: $oppId } }) {
        edges {
          node {
            id
            produto
            largura
            altura
            quantidade
            cor
            localizacao
            preparado
          }
        }
      }
    }
  `;
  const data = await crmFetch<any>(query, { oppId: opportunityId });
  return data?.itemdeservicos?.edges?.map((e: any) => e.node) || [];
}
