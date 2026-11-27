import { getTechnicianColor } from "@/lib/map/taskMarkerDescriptor";

/** Borda do chip de filtro = mesma cor da bolinha do pino. */
export function technicianFilterBorderStyle(name: string): { borderColor: string } {
  return { borderColor: getTechnicianColor(name) };
}
