import type { MeasurementsPayload } from "@/lib/schemas";

/** Técnicos não podem alterar preços — mantém os valores já gravados (por índice de grupo/linha). */
export function preservePricesForTechnicianSubmit(
  incoming: MeasurementsPayload,
  existing: MeasurementsPayload | null | undefined
): MeasurementsPayload {
  if (!existing?.groups?.length) {
    return {
      groups: incoming.groups.map((g) => ({
        ...g,
        measurements: g.measurements.map((m) => ({ ...m, price: undefined })),
      })),
    };
  }

  return {
    groups: incoming.groups.map((g, gi) => ({
      ...g,
      measurements: g.measurements.map((m, mi) => {
        const prev = existing.groups[gi]?.measurements[mi]?.price;
        const preserved =
          prev != null && String(prev).trim() !== "" ? String(prev) : undefined;
        return { ...m, price: preserved };
      }),
    })),
  };
}
