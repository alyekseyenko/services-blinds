/** Contorno extra do pino: atrasada (hora da visita) vs parado no pipeline. */

export function mapPinAlertColor(input: {
  isLate: boolean;
  delayAlert?: "red" | "orange" | null;
  scheduledAt?: string | Date | null;
  now?: Date;
}): string | null {
  if (input.isLate) return "#dc2626";

  const visit = input.scheduledAt;
  if (visit != null && visit !== "") {
    const t = new Date(visit).getTime();
    if (!Number.isNaN(t) && t > (input.now ?? new Date()).getTime()) {
      return null;
    }
  }

  if (input.delayAlert === "red") return "#ef4444";
  if (input.delayAlert === "orange") return "#f59e0b";
  return null;
}