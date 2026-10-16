"use client";

import type { ProductGroup } from "@/types";
import {
  COMPACT_MATERIAL_TYPE_OPTIONS,
  COMPACT_PLACEMENT_OPTIONS,
  MANUAL_TYPE_OPTIONS,
  RTS_COMMAND_MODE_OPTIONS,
  RTS_MOTOR_BRAND_OPTIONS,
} from "@/lib/measurementLabels";
import { getGroupSpecDetailEntries } from "@/lib/measurementGroupSpecDisplay";
import {
  MOSQUITO_OPENING_OPTIONS,
  formatMosquitoOpeningDisplay,
} from "@/lib/measurements/extendedFields";

const selectClass =
  "w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all disabled:bg-muted disabled:text-muted-foreground";

const inputClass =
  "w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none";

type Props = {
  group: ProductGroup;
  isAdmin: boolean;
  onUpdateGroupDetails: (id: number, field: string, value: string) => void;
};

export function MeasurementGroupSpecExtras({
  group,
  isAdmin,
  onUpdateGroupDetails,
}: Props) {
  const d = group.details;
  const set = (field: string, value: string) => onUpdateGroupDetails(group.id, field, value);

  const showCompactExtras =
    group.type === "ESTORE_EXTERIOR" && d.material === "COMPACTO";
  const showManual = d.activation === "MANUAL" && group.type !== "MOSQUITEIRO";
  const showRts = d.activation === "MOTOR_RTS" && group.type !== "MOSQUITEIRO";
  const showMosquitoOpening =
    group.type === "MOSQUITEIRO" && d.model === "PORTA_AMERICA";

  if (
    !showCompactExtras &&
    !showManual &&
    !showRts &&
    !showMosquitoOpening
  ) {
    return null;
  }

  const adminSpecLines = isAdmin
    ? getGroupSpecDetailEntries(group.type, d)
    : [];

  const adminSpecByLabel = Object.fromEntries(adminSpecLines.map((e) => [e.label, e.value]));

  return (
    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border pt-3">
      {showCompactExtras ? (
        <>
          <div className="space-y-1">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
              Tipo compacto
            </label>
            {isAdmin ? (
              <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                {adminSpecByLabel["Tipo compacto"] || "—"}
              </div>
            ) : (
              <select
                className={selectClass}
                value={d.compactPlacement ?? ""}
                disabled={isAdmin}
                onChange={(e) => set("compactPlacement", e.target.value)}
              >
                <option value="">Interior ou exterior…</option>
                {COMPACT_PLACEMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
              Material compacto
            </label>
            {isAdmin ? (
              <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                {adminSpecByLabel["Material compacto"] || "—"}
              </div>
            ) : (
              <select
                className={selectClass}
                value={d.compactMaterialType ?? ""}
                disabled={isAdmin}
                onChange={(e) => set("compactMaterialType", e.target.value)}
              >
                <option value="">PVC / alumínio…</option>
                {COMPACT_MATERIAL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
        </>
      ) : null}

      {showManual ? (
        <div className="space-y-1">
          <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
            Se é manual
          </label>
          {isAdmin ? (
            <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
              {adminSpecByLabel["Tipo manual"] || "—"}
            </div>
          ) : (
            <select
              className={selectClass}
              value={d.manualType ?? ""}
              disabled={isAdmin}
              onChange={(e) => set("manualType", e.target.value)}
            >
              <option value="">Manivela ou fita…</option>
              {MANUAL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </div>
      ) : null}

      {showRts ? (
        <>
          <div className="space-y-1">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
              Comandos RTS
            </label>
            {isAdmin ? (
              <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                {adminSpecByLabel["Comandos RTS"] || "—"}
              </div>
            ) : (
              <select
                className={selectClass}
                value={d.rtsCommandMode ?? ""}
                disabled={isAdmin}
                onChange={(e) => set("rtsCommandMode", e.target.value)}
              >
                <option value="">1 ou vários canais…</option>
                {RTS_COMMAND_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
          {d.rtsCommandMode === "VARIOS_CANAIS" ? (
            <div className="space-y-1">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                Quantidade de canais
              </label>
              {isAdmin ? (
                <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                  {adminSpecByLabel["Canais RTS"] || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={d.rtsChannelCount ?? ""}
                  onChange={(e) => set("rtsChannelCount", e.target.value.replace(/\D/g, ""))}
                />
              )}
            </div>
          ) : null}
          <div className="space-y-1">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
              Marca motor / comando
            </label>
            {isAdmin ? (
              <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                {adminSpecByLabel["Marca motor / comando"] || "—"}
              </div>
            ) : (
              <select
                className={selectClass}
                value={d.rtsMotorBrand ?? ""}
                disabled={isAdmin}
                onChange={(e) => set("rtsMotorBrand", e.target.value)}
              >
                <option value="">Somfy, Gaviota…</option>
                {RTS_MOTOR_BRAND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
          {d.rtsMotorBrand === "OUTRO" && !isAdmin ? (
            <div className="space-y-1">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                Outra marca
              </label>
              <input
                type="text"
                className={inputClass}
                value={d.otherRtsMotorBrand ?? ""}
                onChange={(e) => set("otherRtsMotorBrand", e.target.value)}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {showMosquitoOpening ? (
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
            Abertura (porta América)
          </label>
          {isAdmin ? (
            <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
              {formatMosquitoOpeningDisplay(d.mosquitoOpening) || "—"}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {MOSQUITO_OPENING_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`min-h-12 min-w-12 rounded-lg border-2 px-3 text-sm font-black ${
                    d.mosquitoOpening === option
                      ? "border-primary bg-primary/15"
                      : "border-border bg-card"
                  }`}
                  onClick={() =>
                    set("mosquitoOpening", d.mosquitoOpening === option ? "" : option)
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
