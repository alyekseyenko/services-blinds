"use client";

import { Calendar as CalendarIcon, Map as MapIcon, MapPin, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContactPhoneList from "@/components/ui/ContactPhoneList";
import { formatClientNifDisplay } from "@/lib/ui/ptPtDisplay";
import type { Opportunity } from "@/types/admin";
import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import { FairOnSiteDurationHelpButton } from "@/components/admin/FairOnSiteDurationHelpButton";
import { AdminOppSection } from "@/components/admin/drawer/AdminOppSection";

export function OpportunityMetaSections(props: {
  selectedOpportunity: Opportunity;
  isCompleted: boolean;
  contactPhones: string[];
  fairBenchmarksReady: boolean;
  fairTypeDuration: FairServiceTypeDuration | undefined;
  scheduleNoteLabel: string | null;
  scheduleNoteStats: { schedulingNotes: number };
  handleUpdateGps: (opp: Opportunity) => Promise<void> | void;
}) {
  const {
    selectedOpportunity,
    isCompleted,
    contactPhones,
    fairBenchmarksReady,
    fairTypeDuration,
    scheduleNoteLabel,
    scheduleNoteStats,
    handleUpdateGps,
  } = props;

  return (
    <>
      <AdminOppSection title="Local e agenda">
        <p className="flex items-start gap-3 text-sm font-semibold text-muted-foreground">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
          <span className="text-foreground">{selectedOpportunity.address}</span>
        </p>
        {selectedOpportunity.scheduledAt ? (
          <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <CalendarIcon className="h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
            <span className="text-foreground">
              {isCompleted ? "Realizado: " : "Agendado: "}
              <span className="ds-num">
                {selectedOpportunity.scheduledAt instanceof Date
                  ? selectedOpportunity.scheduledAt.toLocaleString("pt-PT")
                  : new Date(selectedOpportunity.scheduledAt).toLocaleString("pt-PT")}
              </span>
            </span>
          </p>
        ) : (
          <p className="text-xs font-medium text-muted-foreground">Sem visita agendada.</p>
        )}
        {selectedOpportunity.visitOnSiteDurationLabel ? (
          <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <Clock className="h-5 w-5 shrink-0 text-info-solid" aria-hidden />
            <span className="text-foreground">
              Tempo no local:{" "}
              <span className="ds-num">{selectedOpportunity.visitOnSiteDurationLabel}</span>
              <span className="block text-xs font-medium text-muted-foreground">
                Entre «Cheguei ao local» e o encerramento na app.
              </span>
            </span>
          </p>
        ) : null}
        {fairBenchmarksReady ? (
          <p className="flex items-start gap-3 text-sm font-semibold text-muted-foreground">
            <Clock className="h-5 w-5 shrink-0 text-info-solid" aria-hidden />
            <span className="min-w-0 flex-1 text-foreground">
              {fairTypeDuration ? (
                <>
                  {fairTypeDuration.serviceLabel} · tempo médio na equipa:{" "}
                  <span className="ds-num">{fairTypeDuration.formattedRecommended}</span>
                </>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  Tempo médio ainda indisponível para este tipo (menos de 5 visitas concluídas com tempo
                  registado na app).
                </span>
              )}
              <span className="mt-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {fairTypeDuration ? <span>Referência para planear visitas deste tipo.</span> : null}
                <FairOnSiteDurationHelpButton className="min-h-10 min-w-10" />
              </span>
            </span>
          </p>
        ) : null}
        {scheduleNoteLabel ? (
          <div className="space-y-0.5 text-xs font-semibold text-muted-foreground">
            <p>
              Histórico: <span className="text-foreground">{scheduleNoteLabel}</span>
            </p>
            {scheduleNoteStats.schedulingNotes >= 2 ? (
              <p className="font-medium">
                Cada nota corresponde a um agendamento ou reagendamento pela operação.
              </p>
            ) : null}
          </div>
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="md"
          className="mt-1 w-full"
          data-tour="admin-opp-gps-btn"
          onClick={() => handleUpdateGps(selectedOpportunity)}
        >
          <MapIcon className="mr-2 h-4 w-4" aria-hidden />
          Atualizar GPS
        </Button>
      </AdminOppSection>

      <AdminOppSection title="Contactos" data-tour="admin-opp-client-block">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            {contactPhones.length > 0 ? (
              <ContactPhoneList phones={contactPhones} emptyLabel="Indisponível" />
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Telefone indisponível</p>
            )}
          </div>
          {formatClientNifDisplay(selectedOpportunity.clientNif) ? (
            <p className="shrink-0 text-xs font-semibold text-muted-foreground">
              NIF{" "}
              <span className="ds-num font-bold text-foreground">
                {formatClientNifDisplay(selectedOpportunity.clientNif)}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t-2 border-border pt-3">
          <div className="min-w-0">
            <p className="ds-kicker">E-mail</p>
            <p className="mt-1 truncate text-sm font-bold text-foreground">
              {selectedOpportunity.pointOfContactEmail || "Indisponível"}
            </p>
          </div>
          {selectedOpportunity.pointOfContactEmail ? (
            <a
              href={`mailto:${selectedOpportunity.pointOfContactEmail}`}
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-card text-muted-foreground transition-all hover:border-primary hover:text-primary-ink active:scale-95"
              aria-label="Enviar e-mail ao cliente"
            >
              <Mail className="h-4 w-4 text-info-solid" />
            </a>
          ) : null}
        </div>
      </AdminOppSection>
    </>
  );
}