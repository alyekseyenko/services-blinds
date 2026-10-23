"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  RTS_MAX_COMMANDS,
  formatRtsCommandsSummary,
  getRtsCommandSpecs,
  parseRtsCommandCount,
  updateRtsCommandSpec,
  type RtsCommandMode,
} from "@/lib/measurements/rtsCommands";
import type { ProductGroupDetails } from "@/types";

const inputClass =
  "w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none";

const MODE_OPTIONS: { value: Exclude<RtsCommandMode, "">; label: string }[] = [
  { value: "UM_CANAL", label: "1 canal" },
  { value: "VARIOS_CANAIS", label: "Vários canais" },
];

type Props = {
  details: ProductGroupDetails;
  readOnly: boolean;
  onChange: (field: "rtsCommandCount" | "rtsCommandChannels", value: string) => void;
};

export function RtsCommandsEditor({ details, readOnly, onChange }: Props) {
  const specs = getRtsCommandSpecs(details);
  const committedCount = details.rtsCommandCount?.trim() || (specs.length ? String(specs.length) : "");
  const [countDraft, setCountDraft] = useState(committedCount);

  useEffect(() => {
    setCountDraft(committedCount);
  }, [committedCount]);

  if (readOnly) {
    return (
      <div className="space-y-1 md:col-span-2">
        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
          Comandos RTS
        </span>
        <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
          {formatRtsCommandsSummary(details) || "—"}
        </div>
      </div>
    );
  }

  const commitCount = () => {
    const n = parseRtsCommandCount(countDraft);
    const next = n > 0 ? String(n) : "";
    setCountDraft(next);
    if (next === (details.rtsCommandCount?.trim() ?? "")) return;
    if (!details.rtsCommandChannels?.trim() && specs.length > 0) {
      onChange("rtsCommandChannels", updateRtsCommandSpec(details, 1, {}));
    }
    onChange("rtsCommandCount", next);
  };

  const setSpec = (index: number, patch: Parameters<typeof updateRtsCommandSpec>[2]) => {
    if (!details.rtsCommandCount?.trim() && specs.length > 0) {
      onChange("rtsCommandCount", String(specs.length));
    }
    onChange("rtsCommandChannels", updateRtsCommandSpec(details, index, patch));
  };

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="space-y-1 max-w-[14rem]">
        <label
          htmlFor="rts-command-count"
          className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
        >
          Quantidade de comandos
        </label>
        <div className="flex flex-wrap gap-2 pb-1" role="group" aria-label="Atalhos quantidade de comandos">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={committedCount === String(n)}
              className={cn(
                "min-h-12 min-w-12 rounded-xl border-2 text-sm font-black",
                committedCount === String(n)
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
              onClick={() => {
                const next = String(n);
                setCountDraft(next);
                if (next !== (details.rtsCommandCount?.trim() ?? "")) {
                  if (!details.rtsCommandChannels?.trim() && specs.length > 0) {
                    onChange("rtsCommandChannels", updateRtsCommandSpec(details, 1, {}));
                  }
                  onChange("rtsCommandCount", next);
                }
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <input
          id="rts-command-count"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={inputClass}
          placeholder={`1 a ${RTS_MAX_COMMANDS}`}
          value={countDraft}
          onChange={(e) => setCountDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
          onBlur={commitCount}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCount();
            }
          }}
        />
      </div>

      {specs.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {specs.map((spec) => (
            <li
              key={spec.index}
              className="space-y-2 rounded-xl border-2 border-border bg-card p-3"
            >
              <p className="text-sm font-black text-foreground">Comando {spec.index}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`Canais do comando ${spec.index}`}>
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={spec.mode === option.value}
                    className={cn(
                      "min-h-12 rounded-lg border-2 px-3 text-sm font-black",
                      spec.mode === option.value
                        ? "border-primary bg-primary/15"
                        : "border-border bg-card"
                    )}
                    onClick={() => setSpec(spec.index, { mode: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {spec.mode === "VARIOS_CANAIS" ? (
                <div className="space-y-1">
                  <label
                    htmlFor={`rts-command-${spec.index}-channels`}
                    className="text-xs font-bold text-muted-foreground px-1"
                  >
                    Quantos canais
                  </label>
                  <div className="flex flex-wrap gap-2 pb-1" role="group" aria-label={`Atalhos canais comando ${spec.index}`}>
                    {[2, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={spec.channelCount === n}
                        className={cn(
                          "min-h-10 min-w-10 rounded-lg border-2 text-xs font-black",
                          spec.channelCount === n
                            ? "border-primary bg-primary/15"
                            : "border-border bg-card text-muted-foreground"
                        )}
                        onClick={() => setSpec(spec.index, { channelCount: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <input
                    id={`rts-command-${spec.index}-channels`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={cn(inputClass, "max-w-[8rem]")}
                    placeholder="Ex: 5"
                    value={spec.channelCount ?? ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                      const n = Number.parseInt(digits, 10);
                      setSpec(spec.index, { channelCount: Number.isFinite(n) && n > 0 ? n : null });
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
