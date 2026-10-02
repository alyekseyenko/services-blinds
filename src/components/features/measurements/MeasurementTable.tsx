import React from "react";
import { Copy, Trash2, Plus } from "lucide-react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { ProductGroup, MeasurementRow } from "@/types";
import { hapticLight } from "@/lib/haptics";

interface MeasurementTableProps {
  group: ProductGroup;
  isAdmin: boolean;
  onUpdateMeasurement: (groupId: number, rowIndex: number, field: string, value: string) => void;
  onCloneRow: (groupId: number, row: MeasurementRow) => void;
  onAddRow: (groupId: number) => void;
  onRemoveRow: (groupId: number, rowIndex: number) => void;
}

export function MeasurementTable({ group, isAdmin, onUpdateMeasurement, onCloneRow, onAddRow, onRemoveRow }: MeasurementTableProps) {
  const isDesktop = useMediaMinWidth(768);
  const triggerHaptic = (ms = 30) => {
    hapticLight(ms);
  };

  if (isDesktop) {
  return (
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[500px] border-separate border-spacing-y-2 print:border-collapse print:border-spacing-0">
          <thead>
            <tr className="text-left print:bg-muted">
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Qtd</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Larg (mm)</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Alt (mm)</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Fixação</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Comandos</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Notas / Divisão</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Preço (€)</th>
              <th className="pb-3 w-10 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {group.measurements.map((row, rIdx) => (
              <tr key={rIdx} className="group print:break-inside-avoid">
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground text-center">{row.qty || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-14 h-12 bg-card border-2 border-border-strong rounded-xl px-2 text-base font-black text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.qty}
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'qty', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground text-center">{row.width || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.width}
                      placeholder="Ex: 1200"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'width', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground text-center">{row.height || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.height}
                      placeholder="Ex: 1500"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'height', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground text-center">{row.fixation || '-'}</div>
                  ) : (
                    <input 
                      type="text" 
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-sm font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.fixation}
                      placeholder="Teto / Parede"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'fixation', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground text-center">{row.controls || '-'}</div>
                  ) : (
                    <input 
                      type="text" 
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-sm font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.controls}
                      placeholder="Esq / Dir"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'controls', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground text-center">{row.notes || '-'}</div>
                  ) : (
                    <input 
                      type="text" 
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-sm font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.notes}
                      placeholder="Ex: Janela Sala"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'notes', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground text-center">{row.price ? `${row.price}€` : '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="decimal"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.price}
                      placeholder="0.00"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'price', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:hidden flex items-center gap-1">
                  {!isAdmin && (
                    <>
                      <button 
                        onClick={() => { triggerHaptic(); onCloneRow(group.id, row); }}
                        className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-primary-ink"
                        aria-label="Duplicar linha"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { triggerHaptic(50); onRemoveRow(group.id, rIdx); }}
                        className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-danger-surface hover:text-danger-solid"
                        aria-label="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 print:hidden">
        {group.measurements.map((row, rIdx) => (
          <div key={rIdx} className="bg-muted/90 rounded-2xl p-4 border border-border-strong shadow-sm relative transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="rounded-lg bg-secondary/80 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-primary-foreground">
                Medição #{rIdx + 1}
              </span>
              <div className="flex gap-2">
                {!isAdmin && (
                  <>
                    <button 
                      onClick={() => { triggerHaptic(); onCloneRow(group.id, row); }}
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-border-strong bg-card text-muted-foreground shadow-sm transition-all hover:bg-muted"
                      aria-label="Duplicar medição"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { triggerHaptic(50); onRemoveRow(group.id, rIdx); }}
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-border-strong bg-card text-danger-solid shadow-sm transition-all hover:bg-danger-surface"
                      aria-label="Eliminar medição"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Linha 1: Qtd & Preço */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1">
                <label className="px-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Quantidade</label>
                {isAdmin ? (
                  <div className="bg-card rounded-xl p-3 text-sm font-black text-foreground border border-border">{row.qty || '-'}</div>
                ) : (
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full bg-card border-2 border-border-strong rounded-xl p-3 text-sm font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                    value={row.qty}
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'qty', e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="px-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Preço (€)</label>
                {isAdmin ? (
                  <div className="bg-card rounded-xl p-3 text-sm font-black text-foreground border border-border">{row.price ? `${row.price}€` : '-'}</div>
                ) : (
                  <input 
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-card border-2 border-border-strong rounded-xl p-3 text-sm font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                    value={row.price}
                    placeholder="0.00"
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'price', e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Linha 2: Largura e Altura (Teclado Numérico Imediato) */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1">
                <label className="flex items-center justify-between px-1 text-xs font-black uppercase tracking-widest text-foreground">
                  <span>Largura</span> <span className="text-xs font-black text-primary-ink">MM</span>
                </label>
                {isAdmin ? (
                  <div className="bg-card rounded-xl p-3 text-sm font-black text-foreground border border-border">{row.width || '-'}</div>
                ) : (
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full bg-card border-2 border-border-strong rounded-xl p-3 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                    value={row.width}
                    placeholder="Ex: 1200"
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'width', e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="flex items-center justify-between px-1 text-xs font-black uppercase tracking-widest text-foreground">
                  <span>Altura</span> <span className="text-xs font-black text-primary-ink">MM</span>
                </label>
                {isAdmin ? (
                  <div className="bg-card rounded-xl p-3 text-sm font-black text-foreground border border-border">{row.height || '-'}</div>
                ) : (
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full bg-card border-2 border-border-strong rounded-xl p-3 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                    value={row.height}
                    placeholder="Ex: 1500"
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'height', e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Linha 3: Fixação e Comandos */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1">
                <label className="text-sm font-black text-muted-foreground uppercase tracking-widest px-1">Fixação</label>
                {isAdmin ? (
                  <div className="bg-card rounded-xl p-3 text-sm font-black text-foreground border border-border">{row.fixation || '-'}</div>
                ) : (
                  <input 
                    type="text" 
                    className="w-full bg-card border-2 border-border-strong rounded-xl p-3 text-sm font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                    value={row.fixation}
                    placeholder="Teto / Parede"
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'fixation', e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-black text-muted-foreground uppercase tracking-widest px-1">Comandos</label>
                {isAdmin ? (
                  <div className="bg-card rounded-xl p-3 text-sm font-black text-foreground border border-border">{row.controls || '-'}</div>
                ) : (
                  <input 
                    type="text" 
                    className="w-full bg-card border-2 border-border-strong rounded-xl p-3 text-sm font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                    value={row.controls}
                    placeholder="Esq / Dir"
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'controls', e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Linha 4: Notas / Divisão */}
            <div className="space-y-1">
              <label className="text-sm font-black text-muted-foreground uppercase tracking-widest px-1">Notas / Divisão</label>
              {isAdmin ? (
                <div className="bg-card rounded-xl p-3 text-sm font-black text-foreground border border-border">{row.notes || '-'}</div>
              ) : (
                <input 
                  type="text" 
                  className="w-full bg-card border-2 border-border-strong rounded-xl p-3 text-sm font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                  value={row.notes}
                  placeholder="Ex: Janela da Sala / Quarto Casal"
                  disabled={isAdmin}
                  onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'notes', e.target.value)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            data-tour="tech-measurements-add-row"
            onClick={() => { triggerHaptic(40); onAddRow(group.id); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-6 py-3.5 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover md:w-auto"
          >
            <Plus className="w-4 h-4 text-foreground stroke-[3]" /> Adicionar Nova Medição (Linha)
          </button>
        </div>
      )}
    </>
  );
}
