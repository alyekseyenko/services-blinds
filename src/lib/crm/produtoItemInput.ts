import { CRM_FIELDS } from "@/lib/crm/contract";
import type { ServiceItem } from "@/lib/crm/items";

const F = CRM_FIELDS.serviceItem;

export function mapServiceItemToProdutoCreateInput(
  item: ServiceItem
): Record<string, unknown> {
  const divisionLabel =
    item.division?.trim() ||
    item.location?.split(" | ")[0]?.replace(/^Local:\s*/, "").trim();
  const name = `${item.product} - ${divisionLabel || "Geral"}`;

  const data: Record<string, unknown> = {
    [F.opportunityRelationId]: item.opportunityId,
    [F.product]: item.product,
    [F.width]: item.width,
    [F.height]: item.height,
    [F.quantity]: item.qty,
    [F.color]: item.color,
    [F.location]: item.location,
    [F.prepared]: item.isPrepared,
    name,
  };

  if (item.division) data[F.division] = item.division;
  if (item.fixation) data[F.fixation] = item.fixation;
  if (item.controls) data[F.controls] = item.controls;
  if (item.material) data[F.material] = item.material;
  if (item.materialOther) data[F.materialOther] = item.materialOther;
  if (item.model) data[F.model] = item.model;
  if (item.ralColor) data[F.ralColor] = item.ralColor;
  if (item.fabric) data[F.fabric] = item.fabric;
  if (item.reference) data[F.reference] = item.reference;
  if (item.activation) data[F.activation] = item.activation;
  if (item.productObservations) data[F.productObservations] = item.productObservations;
  if (item.measurementGroupId) data[F.measurementGroupId] = item.measurementGroupId;
  if (item.price != null && Number.isFinite(item.price)) {
    data[F.price] = item.price;
  }

  return data;
}
