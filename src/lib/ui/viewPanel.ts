import { cn } from "@/lib/cn";

/** Painéis empilhados (mapa/lista): inactivos ficam `hidden` para não pintar por baixo. */
export function viewPanelStackClass(active: boolean, layoutClass?: string): string {
  return cn(
    layoutClass,
    active ? "z-10 bg-background" : "pointer-events-none hidden"
  );
}
