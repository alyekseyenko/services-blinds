"use client";

import { useState, type RefObject } from "react";
import { Clock, Loader2, Map as MapIcon, MapPin, PlayCircle } from "lucide-react";
import NavigationChooser from "@/components/dashboard/NavigationChooser";
import ContactPhoneList from "@/components/ui/ContactPhoneList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { geocodeTaskAddressAction, updateTaskCoordinatesAction } from "@/actions/task-location-actions";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { toUserMessage } from "@/lib/userMessages";
import { useToast } from "@/components/ui/ToastContext";
import { cn } from "@/lib/cn";
import { TECH_DRAWER_BODY, TECH_DRAWER_KICKER } from "./drawerStyles";

export function TaskDrawerClientSection(props: {
  selectedTask: {
    id: string;
    client?: string;
    address: string;
    navigationAddress?: string;
    coordinates?: [number, number] | null;
    dueDate: Date;
    isOverdue?: boolean;
  };
  clientPhones: string[];
  clientNifDisplay: string | null;
  mobileDrawerExpanded: boolean;
  needsArrivalCheckIn: boolean;
  isStartingVisit: boolean;
  startVisitRef: RefObject<HTMLDivElement | null>;
  isOnline: boolean;
  onStartVisit: () => void;
  setSelectedTask: (task: unknown) => void;
  mutateTasks: () => void;
  onGeocodingChange?: (active: boolean) => void;
}) {
  const {
    selectedTask,
    clientPhones,
    clientNifDisplay,
    mobileDrawerExpanded,
    needsArrivalCheckIn,
    isStartingVisit,
    startVisitRef,
    isOnline,
    onStartVisit,
    setSelectedTask,
    mutateTasks,
    onGeocodingChange,
  } = props;
  const toast = useToast();
  const [isGeocoding, setIsGeocoding] = useState(false);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        mobileDrawerExpanded && "md:grid-cols-2 md:gap-4"
      )}
    >
      <Card className="p-5" data-tour="tech-drawer-client-card">
        <CardContent className="space-y-4 p-0">
          {selectedTask.client && selectedTask.client !== "Cliente" ? (
            <div className="space-y-1 border-b border-border pb-4">
              <p className={TECH_DRAWER_KICKER}>Cliente</p>
              <p className={`${TECH_DRAWER_BODY} font-bold text-foreground`}>{selectedTask.client}</p>
              {clientNifDisplay ? (
                <p className="text-xs font-semibold text-muted-foreground">
                  NIF <span className="ds-num font-bold text-foreground">{clientNifDisplay}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-3">
            <p className="flex items-start gap-3 text-sm font-semibold text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
              <span className={TECH_DRAWER_BODY}>{selectedTask.address}</span>
            </p>
            <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 text-primary-ink" />
              <span className={TECH_DRAWER_BODY}>
                {selectedTask.dueDate.toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
            {selectedTask.isOverdue && (
              <p className="rounded-xl border border-warning-border bg-warning-surface px-3 py-2 text-xs font-black uppercase tracking-wider text-warning-solid">
                Visita atrasada — conclua ou contacte o admin
              </p>
            )}
          </div>
          {clientPhones.length > 0 || clientNifDisplay ? (
            <div className="border-t border-border pt-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className={TECH_DRAWER_KICKER}>Telefones do cliente</p>
                {clientNifDisplay ? (
                  <p className="text-xs font-semibold text-muted-foreground">
                    NIF <span className="ds-num font-bold text-foreground">{clientNifDisplay}</span>
                  </p>
                ) : null}
              </div>
              {clientPhones.length > 0 ? (
                <ContactPhoneList phones={clientPhones} emptyLabel="Indisponível" />
              ) : (
                <p className="text-sm font-medium text-muted-foreground">Telefone indisponível</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card
        ref={startVisitRef}
        className="flex flex-col gap-2 p-4 scroll-mt-4"
        data-tour="tech-drawer-contact-card"
      >
        {needsArrivalCheckIn && (
          <Button
            data-tour="tech-drawer-start-visit"
            onClick={onStartVisit}
            disabled={isStartingVisit}
            className="w-full min-h-12 border-2 border-border-strong bg-primary py-3 font-black text-primary-foreground hover:bg-primary-hover"
            loading={isStartingVisit}
            loadingText="A iniciar visita..."
          >
            <PlayCircle className="mr-2 h-5 w-5" /> Cheguei ao local
          </Button>
        )}
        <button
          type="button"
          disabled={isGeocoding}
          onClick={async () => {
            if (isOnboardingDemoEntity(selectedTask)) {
              toast.info("Formação", "Sincronização de GPS simulada — nada foi enviado.");
              return;
            }
            if (!isOnline) {
              toast.warning("Sem rede", "A sincronização de GPS requer ligação à internet.");
              return;
            }
            setIsGeocoding(true);
            onGeocodingChange?.(true);
            try {
              toast.info("A geolocalizar...", "A recalcular coordenadas com a morada fornecida.");
              const geoResult = await geocodeTaskAddressAction(
                selectedTask.navigationAddress || selectedTask.address
              );
              if (!geoResult.success) {
                throw new Error(geoResult.error || "Erro ao geolocalizar.");
              }
              const newCoords = geoResult.data;
              if (newCoords && newCoords[0]) {
                const coordResult = await updateTaskCoordinatesAction(
                  selectedTask.id,
                  newCoords[0],
                  newCoords[1]
                );
                if (!coordResult.success) {
                  throw new Error(coordResult.error || "Erro ao guardar coordenadas.");
                }
                setSelectedTask({
                  ...selectedTask,
                  coordinates: newCoords,
                });
                mutateTasks();
                toast.success("GPS atualizado", "Coordenadas sincronizadas com o CRM.");
              } else {
                toast.error("GPS não encontrado", "Não foi possível geolocalizar a morada fornecida.");
              }
            } catch (e: unknown) {
              toast.error("Erro no GPS", toUserMessage(e, "Não foi possível atualizar o GPS."));
            } finally {
              setIsGeocoding(false);
              onGeocodingChange?.(false);
            }
          }}
          className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:bg-secondary hover:text-foreground disabled:opacity-60"
        >
          {isGeocoding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : (
            <MapIcon className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          {isGeocoding ? "A sincronizar..." : "Sincronizar coordenadas"}
        </button>
        <NavigationChooser
          address={selectedTask.navigationAddress || selectedTask.address}
          coordinates={selectedTask.coordinates}
          label="Abrir no GPS / Waze"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover"
        />
      </Card>
    </div>
  );
}