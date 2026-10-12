import "server-only";
import { crmFetch } from "@/lib/crm/client";
import { CRM_FIELDS, CRM_OBJECTS } from "@/lib/crm/contract";
import { getProductTypeLabel } from "@/lib/measurements/labels";
import { getSheetById, setLineTwentyProdutoId } from "./repo";

const SI = CRM_OBJECTS.serviceItem;
const F = CRM_FIELDS.serviceItem;

function buildAppLineUrl(sheetId: string, lineId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return `${base}/medicoes/${sheetId}?linha=${encodeURIComponent(lineId)}`;
}

export async function projectTwentyProdutosForSheet(sheetId: string): Promise<void> {
  const sheet = await getSheetById(sheetId);
  if (!sheet?.sheetId) return;

  const opportunityId = sheet.opportunityId;

  const findQuery = `
    query findItems($oppId: UUID!) {
      ${SI.queryName}(filter: { ${F.opportunityRelationId}: { eq: $oppId } }) {
        edges { node { id } }
      }
    }
  `;
  const existingData = await crmFetch<Record<string, { edges: Array<{ node: { id: string } }> }>>(
    findQuery,
    { oppId: opportunityId }
  );
  const existingIds =
    existingData?.[SI.queryName]?.edges?.map((e) => e.node.id) ?? [];

  if (existingIds.length > 0) {
    await Promise.all(
      existingIds.map((id) =>
        crmFetch(`mutation deleteItem($id: UUID!) { ${SI.mutationDelete}(id: $id) { id } }`, {
          id,
        })
      )
    );
  }

  for (const group of sheet.groups) {
    for (const row of group.rows) {
      const lineId = row.lineId;
      if (!lineId) continue;

      const division = row.division || row.notes || "Geral";
      const name = `${getProductTypeLabel(group.productType)} — ${division}`;
      const url = buildAppLineUrl(sheet.sheetId, lineId);

      const data: Record<string, unknown> = {
        [F.opportunityRelationId]: opportunityId,
        [F.product]: group.productType,
        name,
        [F.appLink]: {
          primaryLinkUrl: url,
          primaryLinkLabel: "Ver medições",
        },
        [F.width]: 0,
        [F.height]: 0,
        [F.quantity]: row.qty || 1,
        [F.prepared]: false,
      };

      const createMutation = `
        mutation createItem($data: ${SI.createInputType}!) {
          ${SI.mutationCreate}(data: $data) { id }
        }
      `;
      const res = await crmFetch<Record<string, { id: string }>>(createMutation, { data });
      const created = res?.[SI.mutationCreate];
      const newId =
        created && typeof created === "object" && "id" in created
          ? String(created.id)
          : undefined;
      if (newId) {
        await setLineTwentyProdutoId(lineId, newId);
      }
    }
  }
}
