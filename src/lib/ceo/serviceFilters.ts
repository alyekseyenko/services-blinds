import type { CeoServiceItem } from "@/lib/schemas/ceoMetrics";

export interface CeoServiceFilterOptions {
  selectedMonth: number | null;
  stageFilter: string;
  searchQuery: string;
}

export function filterCeoServices(
  services: CeoServiceItem[],
  { selectedMonth, stageFilter, searchQuery }: CeoServiceFilterOptions
): CeoServiceItem[] {
  return services.filter((item) => {
    if (selectedMonth !== null && item.month !== selectedMonth) {
      return false;
    }
    if (stageFilter !== "ALL" && item.stage !== stageFilter) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesNsi = item.nsi ? item.nsi.toLowerCase().includes(q) : false;
      const matchesTech = item.technician ? item.technician.toLowerCase().includes(q) : false;
      const matchesType = item.serviceType ? item.serviceType.toLowerCase().includes(q) : false;
      if (!matchesName && !matchesNsi && !matchesTech && !matchesType) {
        return false;
      }
    }
    return true;
  });
}

export function getMaxMonthTotal(monthlyEvolution: { total: number }[]): number {
  if (!monthlyEvolution.length) return 1;
  const max = Math.max(...monthlyEvolution.map((m) => m.total));
  return max > 0 ? max : 1;
}
