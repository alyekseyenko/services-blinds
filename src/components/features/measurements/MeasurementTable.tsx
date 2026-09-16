import React from "react";
import { Copy, Trash2, Plus } from "lucide-react";
import { ProductGroup, MeasurementRow } from "@/types";

interface MeasurementTableProps {
  group: ProductGroup;
  isAdmin: boolean;
  onUpdateMeasurement: (groupId: number, rowIndex: number, field: string, value: string) => void;
  onCloneRow: (groupId: number, row: MeasurementRow) => void;
  onAddRow: (groupId: number) => void;
  onRemoveRow: (groupId: number, rowIndex: number) => void;
}

export function MeasurementTable({ group, isAdmin, onUpdateMeasurement, onCloneRow, onAddRow, onRemoveRow }: MeasurementTableProps) {
  const triggerHaptic = (ms = 30) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  };

  return (
    <>
      {/* Tabela de Medidas (Desktop + Tablet Largo + Print) */}
      <div className="hidden md:block overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[500px] border-separate border-spacing-y-2 print:border-collapse print:border-spacing-0">
          <thead>
            <tr className="text-left print:bg-slate-50">
              <th className="pb-3 text-xs font-black text-slate-700 uppercase tracking-wider px-2 print:border print:p-2 print:text-slate-900">Qtd</th>
              <th className="pb-3 text-xs font-black text-slate-700 uppercase tracking-wider px-2 print:border print:p-2 print:text-slate-900">Larg (mm)</th>
              <th className="pb-3 text-xs font-black text-slate-700 uppercase tracking-wider px-2 print:border print:p-2 print:text-slate-900">Alt (mm)</th>
              <th className="pb-3 text-xs font-black text-slate-700 uppercase tracking-wider px-2 print:border print:p-2 print:text-slate-900">Fixação</th>
              <th className="pb-3 text-xs font-black text-slate-700 uppercase tracking-wider px-2 print:border print:p-2 print:text-slate-900">Comandos</th>
              <th className="pb-3 text-xs font-black text-slate-700 uppercase tracking-wider px-2 print:border print:p-2 print:text-slate-900">Notas / Divisão</th>
              <th className="pb-3 text-xs font-black text-slate-700 uppercase tracking-wider px-2 print:border print:p-2 print:text-slate-900">Preço (€)</th>
              <th className="pb-3 w-10 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {group.measurements.map((row, rIdx) => (
              <tr key={rIdx} className="group print:break-inside-avoid">
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 text-center">{row.qty || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-14 h-12 bg-white border-2 border-slate-200 rounded-xl px-2 text-base font-black text-slate-900 text-center focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.qty}
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'qty', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 text-center">{row.width || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-2.5 text-base font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.width}
                      placeholder="Ex: 1200"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'width', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 text-center">{row.height || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-2.5 text-base font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.height}
                      placeholder="Ex: 1500"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'height', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 text-center">{row.fixation || '-'}</div>
                  ) : (
                    <input 
                      type="text" 
                      className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-2.5 text-sm font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.fixation}
                      placeholder="Teto / Parede"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'fixation', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 text-center">{row.controls || '-'}</div>
                  ) : (
                    <input 
                      type="text" 
                      className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-2.5 text-sm font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.controls}
                      placeholder="Esq / Dir"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'controls', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 text-center">{row.notes || '-'}</div>
                  ) : (
                    <input 
                      type="text" 
                      className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-2.5 text-sm font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.notes}
                      placeholder="Ex: Janela Sala"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'notes', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 text-center">{row.price ? `${row.price}€` : '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="decimal"
                      className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-2.5 text-base font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
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
                        className="p-2 text-slate-400 hover:text-[#84cc16] hover:bg-slate-100 rounded-lg transition-all"
                        title="Duplicar Linha"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { triggerHaptic(50); onRemoveRow(group.id, rIdx); }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remover Linha"
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

      {/* Lista de Medidas (Mobile / Smartphone) */}
      <div className="md:hidden space-y-4 print:hidden">
        {group.measurements.map((row, rIdx) => (
          <div key={rIdx} className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200 shadow-sm relative transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-[#090d16] bg-slate-200/80 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                Medição #{rIdx + 1}
              </span>
              <div className="flex gap-2">
                {!isAdmin && (
                  <>
                    <button 
                      onClick={() => { triggerHaptic(); onCloneRow(group.id, row); }}
                      className="p-2 bg-white rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-100 shadow-sm transition-all"
                      title="Duplicar Medição"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { triggerHaptic(50); onRemoveRow(group.id, rIdx); }}
                      className="p-2 bg-white rounded-xl text-red-500 border border-slate-200 hover:bg-red-50 shadow-sm transition-all"
                      title="Eliminar Medição"
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
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Quantidade</label>
                {isAdmin ? (
                  <div className="bg-white rounded-xl p-3 text-sm font-black text-slate-900 border border-slate-100">{row.qty || '-'}</div>
                ) : (
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all"
                    value={row.qty}
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'qty', e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Preço (€)</label>
                {isAdmin ? (
                  <div className="bg-white rounded-xl p-3 text-sm font-black text-slate-900 border border-slate-100">{row.price ? `${row.price}€` : '-'}</div>
                ) : (
                  <input 
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all"
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
                <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest px-1 flex items-center justify-between">
                  <span>Largura</span> <span className="text-[#84cc16] font-black text-[8px]">MM</span>
                </label>
                {isAdmin ? (
                  <div className="bg-white rounded-xl p-3 text-sm font-black text-slate-900 border border-slate-100">{row.width || '-'}</div>
                ) : (
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-base font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all"
                    value={row.width}
                    placeholder="Ex: 1200"
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'width', e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest px-1 flex items-center justify-between">
                  <span>Altura</span> <span className="text-[#84cc16] font-black text-[8px]">MM</span>
                </label>
                {isAdmin ? (
                  <div className="bg-white rounded-xl p-3 text-sm font-black text-slate-900 border border-slate-100">{row.height || '-'}</div>
                ) : (
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-base font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all"
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
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Fixação</label>
                {isAdmin ? (
                  <div className="bg-white rounded-xl p-3 text-sm font-black text-slate-900 border border-slate-100">{row.fixation || '-'}</div>
                ) : (
                  <input 
                    type="text" 
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all"
                    value={row.fixation}
                    placeholder="Teto / Parede"
                    disabled={isAdmin}
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'fixation', e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Comandos</label>
                {isAdmin ? (
                  <div className="bg-white rounded-xl p-3 text-sm font-black text-slate-900 border border-slate-100">{row.controls || '-'}</div>
                ) : (
                  <input 
                    type="text" 
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all"
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
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Notas / Divisão</label>
              {isAdmin ? (
                <div className="bg-white rounded-xl p-3 text-sm font-black text-slate-900 border border-slate-100">{row.notes || '-'}</div>
              ) : (
                <input 
                  type="text" 
                  className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 outline-none transition-all"
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
            onClick={() => { triggerHaptic(40); onAddRow(group.id); }}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3.5 bg-[#84cc16] hover:bg-[#74be12] text-slate-955 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg text-slate-900 border border-[#84cc16]/10"
          >
            <Plus className="w-4 h-4 text-slate-900 stroke-[3]" /> Adicionar Nova Medição (Linha)
          </button>
        </div>
      )}
    </>
  );
}
