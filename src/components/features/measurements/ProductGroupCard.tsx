"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Box, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { useMeasurementsCompactSections } from "@/hooks/useMeasurementsLayout";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ProductGroup, ProductType } from "@/types";
import {
  ACTIVATION_OPTIONS,
  COMMON_RAL_QUICK_PICKS,
  getActivationLabel,
  EXTERIOR_MATERIAL_OPTIONS,
  getMaterialLabel,
  formatProductGroupHeading,
  INTERIOR_MODEL_OPTIONS,
  INTERIOR_ROLO_VARIANT_OPTIONS,
  formatInteriorModelDisplay,
  getInteriorRoloVariantDisplay,
  MOSQUITO_MODEL_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
} from "@/lib/measurementLabels";
import {
  groupHasSpecCompletenessWarnings,
  summarizeMeasurementGroupCompleteness,
} from "@/lib/measurementCompleteness";
import {
  EXTERIOR_INSTALL_TYPE_OPTIONS,
  formatExteriorPartialPartsDisplay,
  getExteriorInstallTypeLabel,
  isExteriorParcialInstall,
} from "@/lib/measurements/exteriorInstall";
import { MeasurementExteriorPartialPartsPicker } from "./MeasurementFieldPickers";
import { MeasurementTable } from "./MeasurementTable";
import { MeasurementGroupSpecExtras } from "./MeasurementGroupSpecExtras";
import { MeasurementFormSection } from "./MeasurementFormSection";
import {
  measurementMaterialSectionStatus,
  measurementMaterialSectionSummary,
  measurementProductSectionShouldDefaultOpen,
  measurementProductSectionSummary,
  measurementWindowsSectionMeta,
  nextExclusiveSection,
  type MeasurementFormSectionStep,
} from "@/lib/measurements/groupFormSectionMeta";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { cn } from "@/lib/cn";

const specOptionBtn = (active: boolean) =>
  cn(
    "min-h-12 rounded-xl border-2 px-2 text-xs font-black uppercase transition-all",
    active
      ? "border-primary bg-primary/15 text-foreground"
      : "border-border bg-card text-muted-foreground"
  );

function measurementGroupFieldId(groupId: number, field: string): string {
  return `measurement-group-${groupId}-${field}`;
}

function RalColorField({
  inputId,
  value,
  locked,
  onChange,
}: {
  inputId: string;
  value: string;
  locked: boolean;
  onChange: (next: string) => void;
}) {
  if (locked) {
    return (
      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
        {value || "-"}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cores frequentes">
        {COMMON_RAL_QUICK_PICKS.map((pick) => (
          <button
            key={pick}
            type="button"
            aria-pressed={value === pick}
            className={specOptionBtn(value === pick)}
            onClick={() => onChange(value === pick ? "" : pick)}
          >
            {pick}
          </button>
        ))}
      </div>
      <input
        id={inputId}
        type="text"
        placeholder="Ex: 7016, Branco..."
        className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-all disabled:bg-muted disabled:text-muted-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface ProductGroupCardProps {
  group: ProductGroup;
  gIdx: number;
  isAdmin: boolean;
  readOnly?: boolean;
  onToggleGroup: (id: number) => void;
  onCloneGroup: (group: ProductGroup) => void;
  onRemoveGroup: (id: number) => void;
  onUpdateGroupType: (id: number, type: ProductType) => void;
  onUpdateGroupDetails: (id: number, field: string, value: string) => void;
  onUpdateMeasurement: (id: number, rowIndex: number, field: string, value: string) => void;
  onCloneRow: (id: number, row: any) => void;
  onAddRow: (id: number) => void;
  onRemoveRow: (id: number, rowIndex: number) => void;
  /** Primeiro grupo editável — âncora do guia de ditada nas observações. */
  voiceObservationsTourAnchor?: boolean;
}

function ProductGroupCardComponent({
  group,
  gIdx,
  isAdmin,
  readOnly = false,
  onToggleGroup,
  onCloneGroup,
  onRemoveGroup,
  onUpdateGroupType,
  onUpdateGroupDetails,
  onUpdateMeasurement,
  onCloneRow,
  onAddRow,
  onRemoveRow,
  voiceObservationsTourAnchor = false,
}: ProductGroupCardProps) {
  const confirm = useConfirm();
  const specLocked = isAdmin || readOnly;
  const focusMeasurements = useMeasurementsCompactSections(!specLocked);
  const [openSection, setOpenSection] = useState<MeasurementFormSectionStep | null>(() =>
    focusMeasurements && measurementProductSectionShouldDefaultOpen(group) ? 1 : 3
  );
  const autoSpecsOpenedRef = useRef(false);
  const autoProductCollapsedRef = useRef(false);

  const setSectionOpen = (step: MeasurementFormSectionStep) => (open: boolean) => {
    setOpenSection((current) => nextExclusiveSection(current, step, open));
  };

  useEffect(() => {
    if (autoSpecsOpenedRef.current || !focusMeasurements) return;
    if (groupHasSpecCompletenessWarnings(group)) {
      setOpenSection(2);
      autoSpecsOpenedRef.current = true;
    }
  }, [focusMeasurements, group]);

  useEffect(() => {
    if (!focusMeasurements || autoProductCollapsedRef.current) return;
    if (!measurementProductSectionShouldDefaultOpen(group)) {
      setOpenSection((current) => (current === 1 ? 3 : current));
      autoProductCollapsedRef.current = true;
    }
  }, [focusMeasurements, group]);

  const completenessHints = useMemo(
    () => (!specLocked ? summarizeMeasurementGroupCompleteness(group) : []),
    [group, specLocked]
  );

  const section1Summary = useMemo(
    () => (!specLocked ? measurementProductSectionSummary(group) : undefined),
    [group, specLocked]
  );
  const section2Summary = useMemo(
    () => (!specLocked ? measurementMaterialSectionSummary(group) : undefined),
    [group, specLocked]
  );
  const section2Status = useMemo(
    () => (!specLocked ? measurementMaterialSectionStatus(group) : undefined),
    [group, specLocked]
  );
  const section3Meta = useMemo(
    () => (!specLocked ? measurementWindowsSectionMeta(group) : undefined),
    [group, specLocked]
  );

  const hasWarnings =
    !specLocked &&
    (completenessHints.length > 0 || groupHasSpecCompletenessWarnings(group));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border-2 bg-card transition-shadow",
        group.isOpen
          ? "border-border-strong shadow-sm"
          : cn(
              "shadow-md ring-2 ring-border-strong/25",
              hasWarnings ? "border-warning-border ring-warning-border/20" : "border-border-strong"
            )
      )}
    >
      <div
        className={cn(
          "flex cursor-pointer items-center justify-between p-4 transition-colors",
          group.isOpen ? "border-b-2 border-border bg-muted" : "bg-card"
        )}
        onClick={() => onToggleGroup(group.id)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold">
            {gIdx + 1}
          </div>
          <div>
            <h4 className="font-black text-foreground text-lg">
              {formatProductGroupHeading(group.type, group.details.customName)}
            </h4>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">
              {group.measurements.reduce((acc, m) => acc + (parseInt(m.qty as string) || 0), 0)} uni •{" "}
              {group.type === "ESTORE_INTERIOR"
                ? formatInteriorModelDisplay(group.details) || "Sem specs"
                : getMaterialLabel(group.details.material, group.details.otherMaterial) ||
                  group.details.model ||
                  "Sem specs"}
            </p>
            {completenessHints.length > 0 ? (
              <p className="mt-0.5 text-xs font-bold text-warning-solid normal-case tracking-normal">
                {completenessHints.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!specLocked && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloneGroup(group);
                }}
                className="flex min-h-12 min-w-12 items-center justify-center text-muted-foreground hover:text-info-solid active:scale-95"
                title="Duplicar produto"
                aria-label="Duplicar produto"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await confirm({
                    title: "Remover produto?",
                    description:
                      "Este produto e todas as linhas de medição associadas serão removidos.",
                    confirmLabel: "Remover",
                    cancelLabel: "Cancelar",
                    destructive: true,
                  });
                  if (ok) onRemoveGroup(group.id);
                }}
                className="flex min-h-12 min-w-12 items-center justify-center text-muted-foreground hover:text-danger-solid active:scale-95"
                aria-label="Remover produto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {group.isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </div>

      {group.isOpen && (
        <div
          className={`${specLocked ? "space-y-8 p-6" : "space-y-4 p-4 md:p-5 lg:space-y-6 lg:p-6"} animate-in slide-in-from-top-2 duration-300`}
        >
          {!specLocked ? (
          <MeasurementFormSection
            step={1}
            title="Produto"
            description="Nome para reconhecer na obra e tipo de estore ou toldo."
            summary={section1Summary}
            collapsible={focusMeasurements}
            open={focusMeasurements ? openSection === 1 : true}
            onOpenChange={setSectionOpen(1)}
          >
            <div className="space-y-1">
              <label
                htmlFor={measurementGroupFieldId(group.id, "customName")}
                className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
              >
                Nome personalizado
              </label>
              <input
                id={measurementGroupFieldId(group.id, "customName")}
                type="text"
                placeholder="Ex.: quarto do fundo, varanda…"
                className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                value={group.details.customName ?? ""}
                onChange={(e) => onUpdateGroupDetails(group.id, "customName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                Tipo de produto
              </span>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {PRODUCT_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => onUpdateGroupType(group.id, type.id)}
                    className={`flex min-h-12 items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-black uppercase transition-all ${
                      group.type === type.id
                        ? "bg-ink border-border text-ink-foreground shadow-lg"
                        : "bg-card border-border text-muted-foreground hover:border-border"
                    }`}
                  >
                    <Box className="h-4 w-4 shrink-0" aria-hidden /> {type.label}
                  </button>
                ))}
              </div>
            </div>
          </MeasurementFormSection>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                Nome personalizado
              </label>
              <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                {group.details.customName?.trim() || "—"}
              </div>
            </div>
          )}

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
            {group.type === "ESTORE_EXTERIOR" && (
              <>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                    Tipo de montagem
                  </label>
                  {specLocked ? (
                    <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                      {getExteriorInstallTypeLabel(group.details.exteriorInstallType) ||
                        getExteriorInstallTypeLabel("COMPLETO")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {EXTERIOR_INSTALL_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onUpdateGroupDetails(group.id, "exteriorInstallType", opt.value);
                            if (opt.value === "PARCIAL") {
                              onUpdateGroupDetails(group.id, "material", "");
                              onUpdateGroupDetails(group.id, "otherMaterial", "");
                            } else {
                              onUpdateGroupDetails(group.id, "partialPartCodes", "");
                              onUpdateGroupDetails(group.id, "partialPartCustom", "");
                            }
                          }}
                          className={`min-h-12 rounded-xl border-2 px-3 text-xs font-black uppercase transition-all ${
                            group.details.exteriorInstallType === opt.value
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isExteriorParcialInstall(group.details.exteriorInstallType) ? (
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                      Material (peças)
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                        {formatExteriorPartialPartsDisplay(
                          group.details.partialPartCodes,
                          group.details.partialPartCustom
                        ) || "—"}
                      </div>
                    ) : (
                      <MeasurementExteriorPartialPartsPicker
                        codes={group.details.partialPartCodes ?? ""}
                        custom={group.details.partialPartCustom ?? ""}
                        onChange={(codes, custom) => {
                          onUpdateGroupDetails(group.id, "partialPartCodes", codes);
                          onUpdateGroupDetails(group.id, "partialPartCustom", custom);
                        }}
                      />
                    )}
                  </div>
                ) : null}

                {group.details.exteriorInstallType === "COMPLETO" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Material</label>
                      {specLocked ? (
                        <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                          {group.details.material === "OUTRO"
                            ? group.details.otherMaterial
                            : group.details.material || "-"}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {EXTERIOR_MATERIAL_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={group.details.material === opt.value}
                              className={specOptionBtn(group.details.material === opt.value)}
                              onClick={() =>
                                onUpdateGroupDetails(
                                  group.id,
                                  "material",
                                  group.details.material === opt.value ? "" : opt.value
                                )
                              }
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!specLocked && group.details.material === "OUTRO" ? (
                      <div className="space-y-1">
                        <label
                          htmlFor={measurementGroupFieldId(group.id, "otherMaterial")}
                          className="text-xs font-black text-info-solid uppercase tracking-widest px-1"
                        >
                          Especificar material
                        </label>
                        <input
                          id={measurementGroupFieldId(group.id, "otherMaterial")}
                          type="text"
                          placeholder="Descreva o material..."
                          className="w-full bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-70"
                          value={group.details.otherMaterial}
                          disabled={specLocked}
                          onChange={(e) => onUpdateGroupDetails(group.id, "otherMaterial", e.target.value)}
                        />
                      </div>
                    ) : null}

                    <div className="space-y-1">
                      <label
                        htmlFor={measurementGroupFieldId(group.id, "ral")}
                        className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
                      >
                        RAL / Cor
                      </label>
                      <RalColorField
                        inputId={measurementGroupFieldId(group.id, "ral")}
                        value={group.details.ral ?? ""}
                        locked={specLocked}
                        onChange={(next) => onUpdateGroupDetails(group.id, "ral", next)}
                      />
                    </div>
                  </>
                ) : null}

                {isExteriorParcialInstall(group.details.exteriorInstallType) ? (
                  <div className="space-y-1">
                    <label
                      htmlFor={measurementGroupFieldId(group.id, "ral")}
                      className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
                    >
                      RAL / Cor
                    </label>
                    <RalColorField
                      inputId={measurementGroupFieldId(group.id, "ral")}
                      value={group.details.ral ?? ""}
                      locked={specLocked}
                      onChange={(next) => onUpdateGroupDetails(group.id, "ral", next)}
                    />
                  </div>
                ) : null}
              </>
            )}

            {(group.type === "ESTORE_INTERIOR" || group.type === "TOLDO" || group.type === "MOSQUITEIRO") && (
              <>
                <div className="space-y-1">
                  <label
                    htmlFor={measurementGroupFieldId(group.id, "model")}
                    className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
                  >
                    Modelo
                  </label>
                  {specLocked ? (
                    <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                      {group.type === "ESTORE_INTERIOR"
                        ? formatInteriorModelDisplay(group.details) || "-"
                        : group.details.model || "-"}
                    </div>
                  ) : (
                    <>
                      {group.type === "ESTORE_INTERIOR" ? (
                          <select
                            id={measurementGroupFieldId(group.id, "model")}
                            className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-all disabled:bg-muted disabled:text-muted-foreground"
                            value={group.details.model}
                            disabled={specLocked}
                            onChange={(e) => {
                              const value = e.target.value;
                              onUpdateGroupDetails(group.id, "model", value);
                              if (value !== "ROLO") {
                                onUpdateGroupDetails(group.id, "roloVariant", "");
                                onUpdateGroupDetails(group.id, "otherRoloVariant", "");
                              }
                              if (value !== "OUTRO" && value !== "SKYLIGHT") {
                                onUpdateGroupDetails(group.id, "otherModel", "");
                              }
                            }}
                          >
                            <option value="">Selecionar...</option>
                            {INTERIOR_MODEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                      ) : group.type === "MOSQUITEIRO" ? (
                        <select
                          id={measurementGroupFieldId(group.id, "model")}
                          className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-all disabled:bg-muted disabled:text-muted-foreground"
                          value={group.details.model}
                          disabled={specLocked}
                          onChange={(e) => onUpdateGroupDetails(group.id, 'model', e.target.value)}
                        >
                          <option value="">Selecionar...</option>
                          {MOSQUITO_MODEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={measurementGroupFieldId(group.id, "model")}
                          type="text"
                          placeholder="Ex: Articulado..."
                          className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:bg-muted disabled:text-muted-foreground"
                          value={group.details.model}
                          disabled={specLocked}
                          onChange={(e) => onUpdateGroupDetails(group.id, 'model', e.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>
                {group.type === "ESTORE_INTERIOR" && group.details.model === "ROLO" ? (
                  <div className="space-y-1">
                    <label
                      htmlFor={measurementGroupFieldId(group.id, "roloVariant")}
                      className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
                    >
                      Tipo de rolo
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                        {group.details.roloVariant
                          ? getInteriorRoloVariantDisplay(
                              group.details.roloVariant,
                              group.details.otherRoloVariant
                            )
                          : "—"}
                      </div>
                    ) : (
                      <select
                        id={measurementGroupFieldId(group.id, "roloVariant")}
                        className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-all"
                        value={group.details.roloVariant ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          onUpdateGroupDetails(group.id, "roloVariant", value);
                          if (value !== "OUTRO") {
                            onUpdateGroupDetails(group.id, "otherRoloVariant", "");
                          }
                        }}
                      >
                        <option value="">Selecionar tipo de rolo…</option>
                        {INTERIOR_ROLO_VARIANT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : null}
                {group.type === "ESTORE_INTERIOR" &&
                group.details.model === "ROLO" &&
                group.details.roloVariant === "OUTRO" ? (
                  <div className="space-y-1">
                    <label
                      htmlFor={measurementGroupFieldId(group.id, "otherRoloVariant")}
                      className="text-xs font-black text-info-solid uppercase tracking-widest px-1"
                    >
                      Extra
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                        {group.details.otherRoloVariant || "—"}
                      </div>
                    ) : (
                      <input
                        id={measurementGroupFieldId(group.id, "otherRoloVariant")}
                        type="text"
                        placeholder="Indique o tipo de rolo…"
                        className="w-full min-h-12 bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                        value={group.details.otherRoloVariant ?? ""}
                        disabled={specLocked}
                        onChange={(e) =>
                          onUpdateGroupDetails(group.id, "otherRoloVariant", e.target.value)
                        }
                      />
                    )}
                  </div>
                ) : null}
                {group.type === "ESTORE_INTERIOR" &&
                (group.details.model === "OUTRO" || group.details.model === "SKYLIGHT") ? (
                  <div className="space-y-1">
                    <label
                      htmlFor={measurementGroupFieldId(group.id, "otherModel")}
                      className="text-xs font-black text-info-solid uppercase tracking-widest px-1"
                    >
                      Especificar modelo
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                        {group.details.otherModel || "—"}
                      </div>
                    ) : (
                      <input
                        id={measurementGroupFieldId(group.id, "otherModel")}
                        type="text"
                        placeholder="Indique o modelo…"
                        className="w-full min-h-12 bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                        value={group.details.otherModel ?? ""}
                        disabled={specLocked}
                        onChange={(e) => onUpdateGroupDetails(group.id, "otherModel", e.target.value)}
                      />
                    )}
                  </div>
                ) : null}
                {group.type === "MOSQUITEIRO" &&
                group.details.model === "PORTA_AMERICA" &&
                !(specLocked && group.details.fabric?.trim()) ? null : (
                <>
                <div className="space-y-1">
                  <label
                    htmlFor={measurementGroupFieldId(group.id, "fabric")}
                    className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
                  >
                    {group.type === "MOSQUITEIRO" ? "Rede" : "Tecido"}
                  </label>
                  {specLocked ? (
                    <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.fabric || '-'}</div>
                  ) : (
                    <input
                      id={measurementGroupFieldId(group.id, "fabric")}
                      type="text"
                      placeholder={group.type === "MOSQUITEIRO" ? "Ex.: tipo de rede…" : "Ex.: coleção ou referência…"}
                      className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:bg-muted disabled:text-muted-foreground"
                      value={group.details.fabric}
                      disabled={specLocked}
                      onChange={(e) => onUpdateGroupDetails(group.id, 'fabric', e.target.value)}
                    />
                  )}
                </div>
                {group.type !== "MOSQUITEIRO" && (
                  <div className="space-y-1">
                    <label
                      htmlFor={measurementGroupFieldId(group.id, "reference")}
                      className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
                    >
                      Referência
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.reference || '-'}</div>
                    ) : (
                      <input
                        id={measurementGroupFieldId(group.id, "reference")}
                        type="text"
                        placeholder="Ex.: ref. fornecedor…"
                        className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:bg-muted disabled:text-muted-foreground"
                        value={group.details.reference}
                        disabled={specLocked}
                        onChange={(e) => onUpdateGroupDetails(group.id, 'reference', e.target.value)}
                      />
                    )}
                  </div>
                )}
                </>
                )}
              </>
            )}

            {group.type !== "MOSQUITEIRO" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Acionamento</label>
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
                <>
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
                      voiceObservationsTourAnchor
                        ? "tech-voice-product-observations"
                        : undefined
                    }
                  />
                </>
              )}
            </div>
            </div>
          </MeasurementFormSection>

          <MeasurementFormSection
            step={3}
            enabled={!specLocked}
            title="Janelas"
            description="Uma linha por vão: medidas, divisão e extras de cada estore."
            summary={section3Meta?.summary}
            statusBadge={section3Meta?.statusBadge}
            collapsible={focusMeasurements}
            open={focusMeasurements ? openSection === 3 : true}
            onOpenChange={setSectionOpen(3)}
          >
            <MeasurementTable
              group={group}
              isAdmin={isAdmin}
              readOnly={readOnly}
              showPriceColumn={isAdmin}
              onUpdateMeasurement={onUpdateMeasurement}
              onCloneRow={onCloneRow}
              onAddRow={onAddRow}
              onRemoveRow={onRemoveRow}
            />
          </MeasurementFormSection>

        </div>
      )}
    </div>
  );
}

export const ProductGroupCard = memo(ProductGroupCardComponent);
