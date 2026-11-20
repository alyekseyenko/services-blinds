"use client";

import { AlertTriangle, Check, Loader2, Plus } from "lucide-react";

import { hapticLight } from "@/lib/haptics";
import type {
  WarehouseGroup as Group,
  WarehouseMeasurement as Measurement,
} from "@/lib/warehouse/types";

type Props = {
  group: Group;
  measurement: Measurement;
  isDone: boolean;
  currentStatus: string;
  itemNoteText: string;
  savingItemNote: boolean;
  onToggleItem: () => void;
  onUpdateStatus: (status: string) => void;
  onItemNoteTextChange: (value: string) => void;
  onSubmitItemNote: () => void;
};

export function PreparationItemRow({
  group,
  measurement: m,
  isDone,
  currentStatus,
  itemNoteText,
  savingItemNote,
  onToggleItem,
  onUpdateStatus,
  onItemNoteTextChange,
  onSubmitItemNote,
}: Props) {
  const rowShell =
    currentStatus === "PREPARADO"
      ? "bg-success-solid/5 border-success-solid/20 ring-4 ring-success-solid/30/5"
      : currentStatus === "EM_PREPARACAO"
        ? "bg-muted/30 border-border-strong hover:border-border"
        : currentStatus === "FALTA_DE_MATERIAL"
          ? "bg-info-solid/5 border-info-solid/20 ring-4 ring-info-solid/30/5"
          : "bg-danger-surface/5 border-danger-solid/20 ring-4 ring-danger-border/5";

  return (
    <div
      className={`group relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 ${rowShell}`}
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full">
        <div className="flex items-center gap-6">
          <button
            type="button"
            role="checkbox"
            aria-checked={isDone}
            aria-label={isDone ? "Marcar item como em preparação" : "Marcar item como preparado"}
            onClick={() => {
              hapticLight(30);
              onToggleItem();
            }}
            className={`flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border-2 transition-all duration-300 active:scale-95 ${
              isDone
                ? "border-success-solid bg-success-solid shadow-lg shadow-success-border/20"
                : "border-border bg-ink hover:border-border-strong"
            }`}
          >
            {isDone ? (
              <Check className="w-7 h-7 text-ink-foreground" />
            ) : (
              <div className="h-2.5 w-2.5 rounded-full bg-muted" />
            )}
          </button>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">
                Medidas
              </p>
              <p className="text-xl font-black text-ink-foreground">
                {m.width}
                <span className="text-info-solid mx-1">×</span>
                {m.height}
                <span className="text-xs ml-1 text-muted-foreground">mm</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">
                Qtd
              </p>
              <p className="text-xl font-black text-ink-foreground">
                {m.qty}
                <span className="text-xs ml-1 text-muted-foreground font-bold uppercase">un</span>
              </p>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">
                Acionamento
              </p>
              <p className="text-sm font-bold text-muted-foreground">{group.details?.activation || "-"}</p>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">
                Fixação
              </p>
              <p className="text-sm font-bold text-muted-foreground">{m.fixation || "-"}</p>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">
                Comandos
              </p>
              <p className="text-sm font-bold text-muted-foreground">{m.controls || "-"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-ink/40 p-2 rounded-2xl border border-border-strong">
          <p className="text-xs text-muted-foreground uppercase font-black tracking-widest px-2 hidden md:block">
            Estado:
          </p>
          {(
            [
              { status: "EM_PREPARACAO", label: "Em Preparação", active: "warning" },
              { status: "PREPARADO", label: "Preparado", active: "success" },
              { status: "FALTA_DE_MATERIAL", label: "Falta Material", active: "info" },
              { status: "PROBLEMAS", label: "Problemas", active: "danger" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.status}
              type="button"
              onClick={() => onUpdateStatus(opt.status)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border min-h-12 ${
                currentStatus === opt.status
                  ? opt.active === "warning"
                    ? "bg-warning-solid/20 text-warning-solid border-warning-solid/30 shadow-lg shadow-warning-solid/20/5"
                    : opt.active === "success"
                      ? "bg-success-solid/20 text-success-solid border-success-solid/30 shadow-lg shadow-success-border/5"
                      : opt.active === "info"
                        ? "bg-info-solid/20 text-info-fg border-info-solid/30 shadow-lg shadow-info-solid/20/5"
                        : "bg-danger-surface/20 text-danger-fg border-danger-solid/30 shadow-lg shadow-danger-surface0/5"
                  : "bg-ink/30 text-muted-foreground border-transparent hover:text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-strong/60 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex-1 w-full">
          {m.notes ? (
            <div className="bg-warning-solid/10 border border-warning-solid/20 p-3 rounded-xl max-w-lg">
              <p className="text-xs text-warning-solid uppercase font-black mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Nota Técnica do Medidor
              </p>
              <p className="text-warning-fg/80 text-sm leading-tight font-medium italic">{m.notes}</p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
              Sem notas técnicas
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto md:max-w-md bg-scrim px-3 py-1.5 border border-border-strong rounded-2xl focus-within:border-info-solid/20 transition-all">
          <input
            type="text"
            value={itemNoteText}
            onChange={(e) => onItemNoteTextChange(e.target.value)}
            placeholder={
              currentStatus === "FALTA_DE_MATERIAL"
                ? "Diga o que falta..."
                : currentStatus === "PROBLEMAS"
                  ? "Qual é o problema?"
                  : "Adicionar nota rápida para este item..."
            }
            className="w-full min-w-0 border-none bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground min-h-12"
            onKeyDown={(e) => {
              if (e.key === "Enter" && itemNoteText.trim() && !savingItemNote) {
                onSubmitItemNote();
              }
            }}
          />
          <button
            type="button"
            onClick={onSubmitItemNote}
            disabled={savingItemNote || !itemNoteText.trim()}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 min-h-12 ${
              !itemNoteText.trim() || savingItemNote
                ? "bg-secondary text-muted-foreground"
                : "bg-info-solid hover:bg-info-solid text-ink-foreground"
            }`}
          >
            {savingItemNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Submeter
          </button>
        </div>
      </div>
    </div>
  );
}