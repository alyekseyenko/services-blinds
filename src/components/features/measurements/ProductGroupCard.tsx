"use client";

import React, { memo, useState } from "react";
import { Box, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ProductGroup, ProductType } from "@/types";
import { MeasurementTable } from "./MeasurementTable";

interface ProductGroupCardProps {
  group: ProductGroup;
  gIdx: number;
  isAdmin: boolean;
  onToggleGroup: (id: number) => void;
  onCloneGroup: (group: ProductGroup) => void;
  onRemoveGroup: (id: number) => void;
  onUpdateGroupType: (id: number, type: ProductType) => void;
  onUpdateGroupDetails: (id: number, field: string, value: string) => void;
  onUpdateMeasurement: (id: number, rowIndex: number, field: string, value: string) => void;
  onCloneRow: (id: number, row: any) => void;
  onAddRow: (id: number) => void;
  onRemoveRow: (id: number, rowIndex: number) => void;
}

function ProductGroupCardComponent({
  group,
  gIdx,
  isAdmin,
  onToggleGroup,
  onCloneGroup,
  onRemoveGroup,
  onUpdateGroupType,
  onUpdateGroupDetails,
  onUpdateMeasurement,
  onCloneRow,
  onAddRow,
  onRemoveRow
}: ProductGroupCardProps) {
  const confirm = useConfirm();
  const isDesktop = useMediaMinWidth(768);
  const focusMeasurements = !isAdmin && !isDesktop;
  const [specsOpen, setSpecsOpen] = useState(false);

  const getProductLabel = (type: string) => {
    const labels: Record<string, string> = {
      ESTORE_EXTERIOR: "Estore Exterior",
      ESTORE_INTERIOR: "Estore Interior",
      TOLDO: "Toldo",
      MOSQUITEIRO: "Mosquiteiro"
    };
    return labels[type] || type;
  };

  return (
    <div className="bg-card rounded-3xl border-2 border-border shadow-sm overflow-hidden print:border-0 print:shadow-none print:break-inside-avoid">
      <div 
        className={`p-4 flex items-center justify-between cursor-pointer transition-colors print:bg-ink print:text-ink-foreground print:rounded-2xl ${group.isOpen ? 'bg-muted' : 'bg-card'}`}
        onClick={() => onToggleGroup(group.id)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold print:bg-card/20 print:text-ink-foreground">
            {gIdx + 1}
          </div>
          <div>
            <h4 className="font-black text-foreground print:text-ink-foreground text-lg">{getProductLabel(group.type)}</h4>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-wider print:text-muted-foreground">
              {group.measurements.reduce((acc, m) => acc + (parseInt(m.qty as string) || 0), 0)} uni • {group.details.material === 'OUTRO' ? group.details.otherMaterial : (group.details.material || group.details.model || 'Sem specs')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {!isAdmin && (
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
          className={`${focusMeasurements ? "space-y-4 p-4" : "space-y-8 p-6"} animate-in slide-in-from-top-2 duration-300 print:p-6 print:space-y-8`}
        >
          {!isAdmin && (
            <div
              className={`grid grid-cols-2 md:grid-cols-4 gap-2 print:hidden ${focusMeasurements ? "gap-1.5" : ""}`}
            >
              {[
                { id: "ESTORE_EXTERIOR", label: "Estore Ext.", icon: Box },
                { id: "ESTORE_INTERIOR", label: "Estore Int.", icon: Box },
                { id: "TOLDO", label: "Toldo", icon: Box },
                { id: "MOSQUITEIRO", label: "Mosquiteiro", icon: Box },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => onUpdateGroupType(group.id, type.id as ProductType)}
                  className={`flex items-center gap-2 rounded-xl border-2 text-xs font-black uppercase transition-all ${
                    focusMeasurements ? "p-2.5" : "p-3"
                  } ${
                    group.type === type.id
                      ? "bg-ink border-border text-ink-foreground shadow-lg"
                      : "bg-card border-border text-muted-foreground hover:border-border"
                  }`}
                >
                  <type.icon className="w-4 h-4" /> {type.label}
                </button>
              ))}
            </div>
          )}

          <div
            className={
              focusMeasurements
                ? "space-y-3 rounded-2xl border-2 border-border bg-muted/80 p-3 print:border-0 print:bg-transparent print:p-0"
                : "space-y-8"
            }
          >
            {focusMeasurements ? (
              <button
                type="button"
                onClick={() => setSpecsOpen((v) => !v)}
                className="flex w-full min-h-11 items-center justify-between gap-2 rounded-xl bg-card px-3 py-2.5 text-left shadow-sm print:hidden"
                aria-expanded={specsOpen}
              >
                <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
                  Material e detalhes
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${specsOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            ) : null}

            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-4 print:gap-2 ${
                focusMeasurements ? "gap-3" : ""
              } ${focusMeasurements && !specsOpen ? "hidden print:grid" : ""}`}
            >
            {group.type === "ESTORE_EXTERIOR" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Material</label>
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
                      {group.details.material === 'OUTRO' ? group.details.otherMaterial : group.details.material || '-'}
                    </div>
                  ) : (
                    <>
                      <div className="hidden print:block text-sm font-black text-foreground border-b border-border pb-1">{group.details.material === 'OUTRO' ? group.details.otherMaterial : group.details.material || '-'}</div>
                      <select 
                        className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all print:hidden disabled:bg-muted disabled:text-muted-foreground"
                        value={group.details.material}
                        disabled={isAdmin}
                        onChange={(e) => onUpdateGroupDetails(group.id, 'material', e.target.value)}
                      >
                        <option value="">Selecionar...</option>
                        <option value="PVC">PVC</option>
                        <option value="ALUMINIO_TERMICO">Alumínio Térmico</option>
                        <option value="ALUMINIO_EXTRUDIDO">Alumínio Extrudido</option>
                        <option value="BRISA_SOLAR">Brisa Solar</option>
                        <option value="COMPACTO">Compacto</option>
                        <option value="OUTRO">Outro (Especificar...)</option>
                      </select>
                    </>
                  )}
                </div>
                
                {!isAdmin && group.details.material === 'OUTRO' && (
                  <div className="space-y-1 print:hidden">
                    <label className="text-xs font-black text-info-solid uppercase tracking-widest px-1">Especificar Material</label>
                    <input 
                      type="text"
                      placeholder="Descreva o material..."
                      className="w-full bg-info-surface border-2 border-info-border rounded-xl p-3 text-sm font-bold text-foreground outline-none disabled:opacity-70"
                      value={group.details.otherMaterial}
                      disabled={isAdmin}
                      onChange={(e) => onUpdateGroupDetails(group.id, 'otherMaterial', e.target.value)}
                    />
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">RAL / Cor</label>
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.ral || '-'}</div>
                  ) : (
                    <>
                      <div className="hidden print:block text-sm font-black text-foreground border-b border-border pb-1">{group.details.ral || '-'}</div>
                      <input 
                        type="text"
                        placeholder="Ex: 7016, Branco..."
                        className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none print:hidden disabled:bg-muted disabled:text-muted-foreground"
                        value={group.details.ral}
                        disabled={isAdmin}
                        onChange={(e) => onUpdateGroupDetails(group.id, 'ral', e.target.value)}
                      />
                    </>
                  )}
                </div>
              </>
            )}

            {(group.type === "ESTORE_INTERIOR" || group.type === "TOLDO" || group.type === "MOSQUITEIRO") && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Modelo</label>
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.model || '-'}</div>
                  ) : (
                    <>
                      <div className="hidden print:block text-sm font-black text-foreground border-b border-border pb-1">{group.details.model || '-'}</div>
                      {group.type === "ESTORE_INTERIOR" ? (
                          <select 
                            className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all print:hidden disabled:bg-muted disabled:text-muted-foreground"
                            value={group.details.model}
                            disabled={isAdmin}
                            onChange={(e) => onUpdateGroupDetails(group.id, 'model', e.target.value)}
                          >
                            <option value="">Selecionar...</option>
                            <option value="ROLO">Rolo</option>
                            <option value="VENEZIANO">Veneziano</option>
                            <option value="VERTICAL">Vertical</option>
                            <option value="DUETTE_PLISSADO">Duette / Plissado</option>
                          </select>
                      ) : group.type === "MOSQUITEIRO" ? (
                        <select 
                          className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all print:hidden disabled:bg-muted disabled:text-muted-foreground"
                          value={group.details.model}
                          disabled={isAdmin}
                          onChange={(e) => onUpdateGroupDetails(group.id, 'model', e.target.value)}
                        >
                          <option value="">Selecionar...</option>
                          <option value="FIXO">Fixo</option>
                          <option value="VERTICAL">Vertical</option>
                          <option value="LATERAL">Lateral</option>
                          <option value="PORTA_AMERICA">Porta América</option>
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Ex: Articulado..."
                          className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none print:hidden disabled:bg-muted disabled:text-muted-foreground"
                          value={group.details.model}
                          disabled={isAdmin}
                          onChange={(e) => onUpdateGroupDetails(group.id, 'model', e.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Tecido / Rede</label>
                  {isAdmin ? (
                    <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.fabric || '-'}</div>
                  ) : (
                    <>
                      <div className="hidden print:block text-sm font-black text-foreground border-b border-border pb-1">{group.details.fabric || '-'}</div>
                      <input 
                        type="text"
                        className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none print:hidden disabled:bg-muted disabled:text-muted-foreground"
                        value={group.details.fabric}
                        disabled={isAdmin}
                        onChange={(e) => onUpdateGroupDetails(group.id, 'fabric', e.target.value)}
                      />
                    </>
                  )}
                </div>
                {group.type !== "MOSQUITEIRO" && (
                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Referência</label>
                    {isAdmin ? (
                      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.reference || '-'}</div>
                    ) : (
                      <>
                        <div className="hidden print:block text-sm font-black text-foreground border-b border-border pb-1">{group.details.reference || '-'}</div>
                        <input 
                          type="text"
                          className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none print:hidden disabled:bg-muted disabled:text-muted-foreground"
                          value={group.details.reference}
                          disabled={isAdmin}
                          onChange={(e) => onUpdateGroupDetails(group.id, 'reference', e.target.value)}
                        />
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {group.type !== "MOSQUITEIRO" && (
              <div className="space-y-1">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Acionamento</label>
                {isAdmin ? (
                  <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">{group.details.activation || '-'}</div>
                ) : (
                  <>
                    <div className="hidden print:block text-sm font-black text-foreground border-b border-border pb-1">{group.details.activation || '-'}</div>
                    <select 
                      className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all print:hidden disabled:bg-muted disabled:text-muted-foreground"
                      value={group.details.activation}
                      disabled={isAdmin}
                      onChange={(e) => onUpdateGroupDetails(group.id, 'activation', e.target.value)}
                    >
                      <option value="">Selecionar...</option>
                      <option value="MANUAL">Manual</option>
                      <option value="MOTOR_INVERSOR">Motor Inversor</option>
                      <option value="MOTOR_RTS">Motor RTS</option>
                      <option value="MOTOR_IO">Motor IO</option>
                    </select>
                  </>
                )}
              </div>
            )}

            <div className="md:col-span-2 space-y-1 print:col-span-4 print:mt-4">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Observações do Produto</label>
              {isAdmin ? (
                <div className="text-sm font-bold text-foreground bg-muted p-4 rounded-xl border border-border italic">
                  {group.details.observations || "Nenhuma observação registada."}
                </div>
              ) : (
                <>
                  <div className="hidden print:block text-sm font-bold text-foreground bg-muted p-4 rounded-xl border border-border italic">
                    {group.details.observations || "Nenhuma observação registada para este produto."}
                  </div>
                  <textarea 
                    placeholder="Ex: Pormenores de instalação..."
                    className="w-full bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none transition-all print:hidden disabled:bg-muted disabled:text-muted-foreground"
                    rows={2}
                    value={group.details.observations}
                    disabled={isAdmin}
                    onChange={(e) => onUpdateGroupDetails(group.id, 'observations', e.target.value)}
                  />
                </>
              )}
            </div>
            </div>

            <div
              className={
                focusMeasurements
                  ? "border-t border-border/90 pt-3 print:border-0 print:pt-0"
                  : ""
              }
            >
              {focusMeasurements ? (
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground print:hidden">
                  Medições
                </p>
              ) : null}
              <MeasurementTable
                group={group}
                isAdmin={isAdmin}
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
