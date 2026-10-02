import type { WarehouseService, WarehouseStats } from "@/lib/warehouse/types";

export function getWarehouseGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 20) return "Boa tarde";
  return "Boa noite";
}

export function filterWarehouseServices(
  services: WarehouseService[],
  searchQuery: string
): WarehouseService[] {
  const q = searchQuery.toLowerCase();
  if (!q.trim()) return services;

  return services.filter(
    (s) =>
      s.title?.toLowerCase().includes(q) ||
      s.nsi?.toLowerCase().includes(q) ||
      s.client?.toLowerCase().includes(q)
  );
}

export function computeWarehouseStats(services: WarehouseService[]): WarehouseStats {
  let fullyPrepared = 0;
  let withProblems = 0;

  services.forEach((s) => {
    if (!s.measurements?.groups) return;

    let totalItems = 0;
    let preparedItems = 0;
    let problemItems = 0;

    s.measurements.groups.forEach((g) => {
      g.measurements.forEach((m) => {
        totalItems++;
        if (m.isPrepared || m.estadoDoArmazem === "PREPARADO") {
          preparedItems++;
        } else if (
          m.estadoDoArmazem === "PROBLEMAS" ||
          m.estadoDoArmazem === "FALTA_DE_MATERIAL"
        ) {
          problemItems++;
        }
      });
    });

    if (totalItems > 0 && preparedItems === totalItems) {
      fullyPrepared++;
    }
    if (problemItems > 0) {
      withProblems++;
    }
  });

  return {
    pending: services.length,
    fullyPrepared,
    withProblems,
  };
}
