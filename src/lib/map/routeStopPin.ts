import type { ItineraryStopKind } from "@/lib/map/technicianDayItinerary";

/** Cores dos pinos do percurso (ao tocar no técnico). Distintas entre si. */
export const ROUTE_STOP_PIN_COLOR = {
  done: "#10b981",
  incomplete: "#f59e0b",
  cancelled: "#ef4444",
  /** Igual ao incompleto, mas vermelho. */
  late: "#dc2626",
  /** Fúcsia — não se confunde com o azul «por fazer». */
  next: "#c026d3",
  pending: "#0284c7",
} as const;

export function routeStopMarkerArt(
  kind: ItineraryStopKind,
  idx: number,
  nextStopIndex: number
): {
  pinColor: string;
  isLate: boolean;
  isNext: boolean;
  symbolText: string;
  statusTitle: string;
} {
  const isDone = kind === "done";
  const isInc = kind === "incomplete";
  const isCanc = kind === "cancelled";
  const isLateKind = kind === "late";
  const isNext = idx === nextStopIndex;

  const pinColor = isDone
    ? ROUTE_STOP_PIN_COLOR.done
    : isInc
      ? ROUTE_STOP_PIN_COLOR.incomplete
      : isCanc
        ? ROUTE_STOP_PIN_COLOR.cancelled
        : isLateKind
          ? ROUTE_STOP_PIN_COLOR.late
          : isNext
            ? ROUTE_STOP_PIN_COLOR.next
            : ROUTE_STOP_PIN_COLOR.pending;

  const symbolText = isDone
    ? "✓"
    : isCanc
      ? "✕"
      : isInc || isLateKind
        ? "!"
        : `${idx + 1}`;

  const statusTitle = isDone
    ? "Concluído"
    : isInc
      ? "Incompleto"
      : isCanc
        ? "Cancelado"
        : isLateKind
          ? "Atrasada"
          : isNext
            ? "Próxima"
            : "Pendente";

  return {
    pinColor,
    /** Sem emblema no canto: o ! vai no disco, como o incompleto. */
    isLate: false,
    isNext: isNext && !isLateKind && !isDone && !isInc && !isCanc,
    symbolText,
    statusTitle,
  };
}
