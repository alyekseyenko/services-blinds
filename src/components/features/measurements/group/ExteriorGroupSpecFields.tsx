"use client";

import type { ProductGroup } from "@/types";
import { EXTERIOR_MATERIAL_OPTIONS } from "@/lib/measurementLabels";
import {
  EXTERIOR_INSTALL_TYPE_OPTIONS,
  formatExteriorPartialPartsDisplay,
  getExteriorInstallTypeLabel,
  isExteriorParcialInstall,
} from "@/lib/measurements/exteriorInstall";
import { MeasurementExteriorPartialPartsPicker } from "../MeasurementFieldPickers";
import { measurementGroupFieldId, specOptionBtn } from "./groupSpecFieldUtils";
import { RalColorField } from "./RalColorField";

export function ExteriorGroupSpecFields({
  group,
  specLocked,
  onUpdateGroupDetails,
}: {
  group: ProductGroup;
  specLocked: boolean;
  onUpdateGroupDetails: (id: number, field: string, value: string) => void;
}) {
  if (group.type !== "ESTORE_EXTERIOR") return null;
  return (
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
  );
}
