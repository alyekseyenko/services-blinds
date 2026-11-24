"use client";

import { AlertCircle, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Opportunity } from "@/types/admin";
import { AdminOppSection } from "@/components/admin/drawer/AdminOppSection";
import { formatRepairPaymentEuros } from "@/lib/visits/repairPaymentAmount";

export function OpportunityTailSections(props: {
  selectedOpportunity: Opportunity;
  handleManualCoordsUpdate: (opp: Opportunity, lat: string, lng: string) => Promise<void> | void;
}) {
  const { selectedOpportunity, handleManualCoordsUpdate } = props;

  return (
    <>
      <AdminOppSection title="Comercial">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-border bg-muted p-3">
            <p className="ds-kicker">Valor</p>
            <p className="mt-1 text-lg font-black text-foreground">
              {selectedOpportunity.amount != null && selectedOpportunity.amount > 0 ? (
                <span className="ds-num">{formatRepairPaymentEuros(selectedOpportunity.amount)}</span>
              ) : (
                "Sob orçamento"
              )}
            </p>
          </div>
          <div className="rounded-xl border-2 border-border bg-muted p-3 text-right">
            <p className="ds-kicker">Estado CRM</p>
            <p className="mt-1 text-sm font-black uppercase text-foreground">
              {selectedOpportunity.stage}
            </p>
          </div>
        </div>
      </AdminOppSection>

      {!selectedOpportunity.coordinates && (
        <AdminOppSection
          title="Coordenadas em falta"
          className="border-l-4 ds-accent-warning bg-warning-surface"
        >
          <p className="text-sm font-medium text-warning-fg">
            Esta morada ainda não tem pin. Tente o GPS ou indique a latitude e a longitude.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Latitude"
              className="ds-input min-h-12 flex-1 px-3 py-2 text-sm"
              id="manual-lat"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Longitude"
              className="ds-input min-h-12 flex-1 px-3 py-2 text-sm"
              id="manual-lng"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full"
            onClick={() => {
              const latEl = document.getElementById("manual-lat") as HTMLInputElement;
              const lngEl = document.getElementById("manual-lng") as HTMLInputElement;
              handleManualCoordsUpdate(selectedOpportunity, latEl?.value ?? "", lngEl?.value ?? "");
            }}
          >
            Guardar coordenadas
          </Button>
        </AdminOppSection>
      )}

      {selectedOpportunity.technicianReport ? (
        <AdminOppSection
          title="Relatório do técnico"
          className="border-l-4 ds-accent-warning bg-warning-surface"
          data-tour="admin-opp-report"
        >
          <p className="flex gap-2 text-sm font-medium leading-relaxed text-warning-fg">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-solid" aria-hidden />
            <span className="italic">&ldquo;{selectedOpportunity.technicianReport}&rdquo;</span>
          </p>
        </AdminOppSection>
      ) : null}

      {selectedOpportunity.clientRating ? (
        <AdminOppSection title="Avaliação do cliente" className="border-l-4 ds-accent-info">
          <div className="flex items-center justify-between gap-2">
            <ShieldCheck className="h-5 w-5 text-info-solid" aria-hidden />
            <div
              className="flex gap-0.5"
              aria-label={`${selectedOpportunity.clientRating} em 5 estrelas`}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-4 w-4",
                    s <= (selectedOpportunity.clientRating || 0)
                      ? "fill-warning-solid text-warning-solid"
                      : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
          </div>
          {selectedOpportunity.clientFeedback ? (
            <p className="rounded-xl border-2 border-border bg-muted p-3 text-sm font-medium italic text-foreground">
              &ldquo;{selectedOpportunity.clientFeedback}&rdquo;
            </p>
          ) : null}
        </AdminOppSection>
      ) : null}
    </>
  );
}