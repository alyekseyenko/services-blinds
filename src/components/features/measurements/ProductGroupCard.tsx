"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Box, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ProductGroup, ProductType } from "@/types";
import {
  ACTIVATION_OPTIONS,
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
  formatEsteiraMeasureTarget,
  formatExteriorPartialPartsDisplay,
  getExteriorInstallTypeLabel,
  isExteriorParcialInstall,
  partialPartsIncludeEsteiras,
} from "@/lib/measurements/exteriorInstall";
import { MeasurementExteriorPartialPartsPicker } from "./MeasurementFieldPickers";
import { MeasurementTable } from "./MeasurementTable";
import { MeasurementGroupSpecExtras } from "./MeasurementGroupSpecExtras";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";

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
  const isDesktop = useMediaMinWidth(768);
  const specLocked = isAdmin || readOnly;
  const focusMeasurements = !specLocked && !isDesktop;
  const [specsOpen, setSpecsOpen] = useState(false);
  const autoSpecsOpenedRef = useRef(false);

  useEffect(() => {
    if (autoSpecsOpenedRef.current || !focusMeasurements) return;
    if (groupHasSpecCompletenessWarnings(group)) {
      setSpecsOpen(true);
      autoSpecsOpenedRef.current = true;
    }
  }, [focusMeasurements, group]);

  const completenessHints = useMemo(
    () => (!specLocked ? summarizeMeasurementGroupCompleteness(group) : []),
    [group, specLocked]
  );

  return (
    <div className="bg-card rounded-3xl border-2 border-border shadow-sm overflow-hidden">
      <div 
        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${group.isOpen ? 'bg-muted' : 'bg-card'}`}
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
          className={`${focusMeasurements ? "space-y-4 p-4" : "space-y-8 p-6"} animate-in slide-in-from-top-2 duration-300`}
        >
          {!specLocked && (
            <div className={focusMeasurements ? "space-y-2" : undefined}>
              {focusMeasurements ? (
                <p className="text-xs font-bold text-muted-foreground px-0.5">
                  1. Produto
                </p>
              ) : null}
            <div
              className={`grid grid-cols-2 md:grid-cols-4 gap-2 ${focusMeasurements ? "gap-1.5" : ""}`}
            >
              {PRODUCT_TYPE_OPTIONS.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onUpdateGroupType(group.id, type.id)}
                  className={`flex items-center gap-2 rounded-xl border-2 text-xs font-black uppercase transition-all ${
                    focusMeasurements ? "p-2.5" : "p-3"
                  } ${
                    group.type === type.id
                      ? "bg-ink border-border text-ink-foreground shadow-lg"
                      : "bg-card border-border text-muted-foreground hover:border-border"
                  }`}
                >
                  <Box className="w-4 h-4" /> {type.label}
                </button>
              ))}
            </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
              Nome personalizado
            </label>
            {specLocked ? (
              <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                {group.details.customName?.trim() || "—"}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Ex.: quarto do fundo, varanda…"
                className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none"
                value={group.details.customName ?? ""}
                onChange={(e) => onUpdateGroupDetails(group.id, "customName", e.target.value)}
              />
            )}
          </div>

          <div className={focusMeasurements ? "space-y-4" : "space-y-8"}>
            {focusMeasurements && !specLocked ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground px-0.5">
                  2. Material e detalhes
                </p>
                <button
                  type="button"
                  onClick={() => setSpecsOpen((v) => !v)}
                  className="flex w-full min-h-11 items-center justify-between gap-2 rounded-xl border-2 border-border bg-card px-3 py-2.5 text-left shadow-sm"
                  aria-expanded={specsOpen}
                >
                  <span className="text-xs font-black text-foreground">
                    {specsOpen ? "Ocultar detalhes" : "Abrir material, RAL, acionamento…"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${specsOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
              </div>
            ) : null}

            {(!focusMeasurements || specsOpen) ? (
            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${
                focusMeasurements ? "gap-3" : ""
              }`}
            >
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

                {isExteriorParcialInstall(group.details.exteriorInstallType) &&
                partialPartsIncludeEsteiras(group.details.partialPartCodes) ? (
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                      Esteiras
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                        {formatEsteiraMeasureTarget(group.details.esteiraMeasureTarget) || "—"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { value: "VAO", label: "Preciso do vão" },
                            { value: "ESTEIRA", label: "Preciso da esteira" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              onUpdateGroupDetails(group.id, "esteiraMeasureTarget", opt.value)
                            }
                            className={`min-h-12 rounded-xl border-2 px-3 text-xs font-black uppercase transition-all ${
                              group.details.esteiraMeasureTarget === opt.value
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
                        <select
                          className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all disabled:bg-muted disabled:text-muted-foreground"
                          value={group.details.material}
                          disabled={specLocked}
                          onChange={(e) => onUpdateGroupDetails(group.id, "material", e.target.value)}
                        >
                          <option value="">Selecionar...</option>
                          {EXTERIOR_MATERIAL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {!specLocked && group.details.material === "OUTRO" ? (
                      <div className="space-y-1">
                        <label className="text-xs font-black text-info-solid uppercase tracking-widest px-1">
                          Especificar material
                        </label>
                        <input
                          type="text"
                          placeholder="Descreva o material..."
                          className="w-full bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none disabled:opacity-70"
                          value={group.details.otherMaterial}
                          disabled={specLocked}
                          onChange={(e) => onUpdateGroupDetails(group.id, "otherMaterial", e.target.value)}
                        />
                      </div>
                    ) : null}

                    <div className="space-y-1">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">RAL / Cor</label>
                      {specLocked ? (
                        <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.ral || "-"}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Ex: 7016, Branco..."
                          className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none disabled:bg-muted disabled:text-muted-foreground"
                          value={group.details.ral}
                          disabled={specLocked}
                          onChange={(e) => onUpdateGroupDetails(group.id, "ral", e.target.value)}
                        />
                      )}
                    </div>
                  </>
                ) : null}

                {isExteriorParcialInstall(group.details.exteriorInstallType) ? (
                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">RAL / Cor</label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.ral || "-"}</div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Ex: 7016, Branco..."
                        className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none disabled:bg-muted disabled:text-muted-foreground"
                        value={group.details.ral}
                        disabled={specLocked}
                        onChange={(e) => onUpdateGroupDetails(group.id, "ral", e.target.value)}
                      />
                    )}
                  </div>
                ) : null}
              </>
            )}

            {(group.type === "ESTORE_INTERIOR" || group.type === "TOLDO" || group.type === "MOSQUITEIRO") && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Modelo</label>
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
                            className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all disabled:bg-muted disabled:text-muted-foreground"
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
                          className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all disabled:bg-muted disabled:text-muted-foreground"
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
                          type="text" 
                          placeholder="Ex: Articulado..."
                          className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none disabled:bg-muted disabled:text-muted-foreground"
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
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
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
                        className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all"
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
                    <label className="text-xs font-black text-info-solid uppercase tracking-widest px-1">
                      Extra
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                        {group.details.otherRoloVariant || "—"}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Indique o tipo de rolo…"
                        className="w-full bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none"
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
                    <label className="text-xs font-black text-info-solid uppercase tracking-widest px-1">
                      Especificar modelo
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                        {group.details.otherModel || "—"}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Indique o modelo…"
                        className="w-full bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none"
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
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                    {group.type === "MOSQUITEIRO" ? "Rede" : "Tecido"}
                  </label>
                  {specLocked ? (
                    <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.fabric || '-'}</div>
                  ) : (
                    <input
                      type="text"
                      className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none disabled:bg-muted disabled:text-muted-foreground"
                      value={group.details.fabric}
                      disabled={specLocked}
                      onChange={(e) => onUpdateGroupDetails(group.id, 'fabric', e.target.value)}
                    />
                  )}
                </div>
                {group.type !== "MOSQUITEIRO" && (
                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Referência</label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.reference || '-'}</div>
                    ) : (
                      <input
                        type="text"
                        className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none disabled:bg-muted disabled:text-muted-foreground"
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
                    <select
                      className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all disabled:bg-muted disabled:text-muted-foreground"
                      value={group.details.activation}
                      disabled={specLocked}
                      onChange={(e) => {
                        const value = e.target.value;
                        onUpdateGroupDetails(group.id, "activation", value);
                        if (value !== "OUTRO") {
                          onUpdateGroupDetails(group.id, "otherActivation", "");
                        }
                      }}
                    >
                      <option value="">Selecionar...</option>
                      {ACTIVATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                {group.details.activation === "OUTRO" ? (
                  <div className="space-y-1">
                    <label className="text-xs font-black text-info-solid uppercase tracking-widest px-1">
                      Especificar acionamento
                    </label>
                    {specLocked ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                        {group.details.otherActivation || "—"}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Descreva o acionamento…"
                        className="w-full bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none"
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
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                  Cor da estrutura
                </label>
                {specLocked ? (
                  <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                    {group.details.structureColor || "—"}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Ex.: branco, RAL…"
                    className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all disabled:bg-muted disabled:text-muted-foreground"
                    value={group.details.structureColor ?? ""}
                    disabled={specLocked}
                    onChange={(e) => onUpdateGroupDetails(group.id, "structureColor", e.target.value)}
                  />
                )}
              </div>
            ) : null}

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Observações do Produto</label>
              {specLocked ? (
                <div className="text-sm font-bold text-foreground bg-muted p-4 rounded-xl border border-border italic">
                  {group.details.observations || "Nenhuma observação registada."}
                </div>
              ) : (
                <>
                  <VoiceTextarea
                    placeholder="Ex: Pormenores de instalação..."
                    textareaClassName="w-full min-h-12 flex-1 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all disabled:bg-muted disabled:text-muted-foreground"
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
            ) : null}

            <div className={focusMeasurements ? "space-y-2" : undefined}>
              {focusMeasurements ? (
                <p className="text-xs font-bold text-muted-foreground px-0.5">
                  3. Janelas
                </p>
              ) : null}
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
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export const ProductGroupCard = memo(ProductGroupCardComponent);
