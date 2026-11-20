"use client";

import type { ProductGroup } from "@/types";
import {
  ACTIVATION_OPTIONS,
  getActivationLabel,
} from "@/lib/measurementLabels";
import { MeasurementFormSection } from "@/components/features/measurements/MeasurementFormSection";
import type {
  MeasurementFormSectionStep,
  SectionStatusBadge,
} from "@/lib/measurements/groupFormSectionMeta";
import { MeasurementGroupSpecExtras } from "@/components/features/measurements/MeasurementGroupSpecExtras";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { measurementGroupFieldId, specOptionBtn } from "./groupSpecFieldUtils";
import { ExteriorGroupSpecFields } from "./ExteriorGroupSpecFields";
import { InteriorToldoMosquitoSpecFields } from "./InteriorToldoMosquitoSpecFields";

export function ProductGroupSpecsSection({
  group,
  specLocked,
  focusMeasurements,
  openSection,
  section2Summary,
  section2Status,
  setSectionOpen,
  onUpdateGroupDetails,
  voiceObservationsTourAnchor,
}: {
  group: ProductGroup;
  specLocked: boolean;
  focusMeasurements: boolean;
  openSection: MeasurementFormSectionStep | null;
  section2Summary?: string;
  section2Status?: SectionStatusBadge;
  setSectionOpen: (step: 1 | 2 | 3) => (open: boolean) => void;
  onUpdateGroupDetails: (id: number, field: string, value: string) => void;
  voiceObservationsTourAnchor?: boolean;
}) {
  return (
    <MeasurementFormSection
      step={2}
      enabled={!specLocked}
      title="Material e detalhes"
      description="Montagem, cores, tecido, acionamento e observações do produto."
      summary={section2Summary}
      statusBadge={section2Status}
      collapsible={focusMeasurements}
      open={focusMeasurements ? openSection === 2 : true}
      onOpenChange={setSectionOpen(2)}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <ExteriorGroupSpecFields
          group={group}
          specLocked={specLocked}
          onUpdateGroupDetails={onUpdateGroupDetails}
        />
        <InteriorToldoMosquitoSpecFields
          group={group}
          specLocked={specLocked}
          onUpdateGroupDetails={onUpdateGroupDetails}
        />

        {group.type !== "MOSQUITEIRO" && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                Acionamento
              </label>
              {specLocked ? (
                <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                  {getActivationLabel(group.details.activation, group.details.otherActivation) || "-"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {ACTIVATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={group.details.activation === opt.value}
                      className={specOptionBtn(group.details.activation === opt.value)}
                      onClick={() => {
                        const value =
                          group.details.activation === opt.value ? "" : opt.value;
                        onUpdateGroupDetails(group.id, "activation", value);
                        if (value !== "OUTRO") {
                          onUpdateGroupDetails(group.id, "otherActivation", "");
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {group.details.activation === "OUTRO" ? (
              <div className="space-y-1">
                <label
                  htmlFor={measurementGroupFieldId(group.id, "otherActivation")}
                  className="text-xs font-black text-info-solid uppercase tracking-widest px-1"
                >
                  Especificar acionamento
                </label>
                {specLocked ? (
                  <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                    {group.details.otherActivation || "—"}
                  </div>
                ) : (
                  <input
                    id={measurementGroupFieldId(group.id, "otherActivation")}
                    type="text"
                    placeholder="Descreva o acionamento…"
                    className="w-full min-h-12 bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                    value={group.details.otherActivation ?? ""}
                    disabled={specLocked}
                    onChange={(e) => onUpdateGroupDetails(group.id, "otherActivation", e.target.value)}
                  />
                )}
              </div>
            ) : null}
          </>
        )}

        <MeasurementGroupSpecExtras
          group={group}
          isAdmin={specLocked}
          onUpdateGroupDetails={onUpdateGroupDetails}
        />

        {group.type === "TOLDO" ? (
          <div className="space-y-1 md:col-span-2">
            <label
              htmlFor={measurementGroupFieldId(group.id, "structureColor")}
              className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
            >
              Cor da estrutura
            </label>
            {specLocked ? (
              <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                {group.details.structureColor || "—"}
              </div>
            ) : (
              <input
                id={measurementGroupFieldId(group.id, "structureColor")}
                type="text"
                placeholder="Ex.: branco, RAL…"
                className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-all disabled:bg-muted disabled:text-muted-foreground"
                value={group.details.structureColor ?? ""}
                disabled={specLocked}
                onChange={(e) => onUpdateGroupDetails(group.id, "structureColor", e.target.value)}
              />
            )}
          </div>
        ) : null}

        <div className="md:col-span-2 space-y-1">
          <label
            htmlFor={measurementGroupFieldId(group.id, "observations")}
            className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
          >
            Observações do Produto
          </label>
          {specLocked ? (
            <div className="text-sm font-bold text-foreground bg-muted p-4 rounded-xl border border-border italic">
              {group.details.observations || "Nenhuma observação registada."}
            </div>
          ) : (
            <VoiceTextarea
              textareaId={measurementGroupFieldId(group.id, "observations")}
              placeholder="Ex: Pormenores de instalação..."
              textareaClassName="w-full min-h-12 flex-1 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-all disabled:bg-muted disabled:text-muted-foreground"
              className="w-full"
              rows={2}
              value={group.details.observations ?? ""}
              disabled={specLocked}
              onChange={(v) => onUpdateGroupDetails(group.id, "observations", v)}
              dataTour={
                voiceObservationsTourAnchor ? "tech-voice-product-observations" : undefined
              }
            />
          )}
        </div>
      </div>
    </MeasurementFormSection>
  );
}