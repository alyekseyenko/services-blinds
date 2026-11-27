import { useMemo } from "react";
import { collectLegendTechnicianNames } from "@/lib/map/legendTechnicians";

export function useLegendTechnicianNames(input: {
  tasks: Array<{ technician?: string | null }>;
  allOpportunities: Array<{ technician?: string | null }>;
  dayHistoryOpportunities: Array<{ technician?: string | null }>;
  techniciansLocations: Array<{ technicianName: string }>;
  knownTechnicianNames?: string[];
}): string[] {
  const {
    tasks,
    allOpportunities,
    dayHistoryOpportunities,
    techniciansLocations,
    knownTechnicianNames = [],
  } = input;
  return useMemo(
    () =>
      collectLegendTechnicianNames({
        taskTechnicians: [
          ...knownTechnicianNames,
          ...tasks.map((task) => task.technician),
          ...allOpportunities.map((opp) => opp.technician),
          ...dayHistoryOpportunities.map((opp) => opp.technician),
        ],
        liveTechnicianNames: techniciansLocations.map((tech) => tech.technicianName),
      }),
    [tasks, allOpportunities, dayHistoryOpportunities, techniciansLocations, knownTechnicianNames]
  );
}
