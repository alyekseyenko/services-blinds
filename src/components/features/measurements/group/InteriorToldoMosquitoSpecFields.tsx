"use client";

import type { ProductGroup } from "@/types";
import {
  formatInteriorModelDisplay,
  getInteriorRoloVariantDisplay,
  INTERIOR_MODEL_OPTIONS,
  INTERIOR_ROLO_VARIANT_OPTIONS,
  MOSQUITO_MODEL_OPTIONS,
} from "@/lib/measurementLabels";
import { measurementGroupFieldId } from "./groupSpecFieldUtils";

export function InteriorToldoMosquitoSpecFields({
  group,
  specLocked,
  onUpdateGroupDetails,
}: {
  group: ProductGroup;
  specLocked: boolean;
  onUpdateGroupDetails: (id: number, field: string, value: string) => void;
}) {
  return (
    <>
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
    </>
  );
}
