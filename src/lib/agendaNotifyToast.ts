import type { AgendaDiffEvent } from "@/lib/agendaDiff";
import { formatAgendaDiffToast } from "@/lib/agendaDiff";
import { agendaKindToToastType } from "@/lib/agendaNotificationStyle";
import type { ToastType } from "@/components/ui/ToastContext";

type AgendaToastApi = Record<ToastType, (title: string, description?: string) => void>;

export function notifyAgendaDiffToast(
  toastApi: AgendaToastApi,
  event: AgendaDiffEvent
): ReturnType<typeof formatAgendaDiffToast> {
  const copy = formatAgendaDiffToast(event);
  const type = agendaKindToToastType(event.kind);
  toastApi[type](copy.title, copy.description);
  return copy;
}
