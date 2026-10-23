import { useEffect } from "react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";

/** Tabela de janelas e secções sempre abertas a partir desta largura (desktop). */
export const MEASUREMENTS_WIDE_LAYOUT_MIN_PX = 1024;

export function useMeasurementsWideLayout(): boolean {
  return useMediaMinWidth(MEASUREMENTS_WIDE_LAYOUT_MIN_PX);
}

/** Secções 1–3 recolhíveis no telemóvel e tablet (técnico em edição). */
export function useMeasurementsCompactSections(editing: boolean): boolean {
  const wide = useMeasurementsWideLayout();
  return editing && !wide;
}

/** Ao passar para layout largo, abre as secções para não ficarem fechadas no PC. */
export function useExpandSectionsOnWideLayout(
  wide: boolean,
  setProductOpen: (open: boolean) => void,
  setSpecsOpen: (open: boolean) => void,
  setWindowsOpen: (open: boolean) => void
): void {
  useEffect(() => {
    if (!wide) return;
    setProductOpen(true);
    setSpecsOpen(true);
    setWindowsOpen(true);
  }, [wide, setProductOpen, setSpecsOpen, setWindowsOpen]);
}
