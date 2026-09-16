import React from "react";
import { Box, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
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

export function ProductGroupCard({
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
    <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden print:border-0 print:shadow-none print:break-inside-avoid">
      <div 
        className={`p-4 flex items-center justify-between cursor-pointer transition-colors print:bg-slate-900 print:text-white print:rounded-2xl ${group.isOpen ? 'bg-slate-50' : 'bg-white'}`}
        onClick={() => onToggleGroup(group.id)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold print:bg-white/20 print:text-white">
            {gIdx + 1}
          </div>
          <div>
            <h4 className="font-black text-slate-900 print:text-white text-lg">{getProductLabel(group.type)}</h4>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider print:text-slate-300">
              {group.measurements.reduce((acc, m) => acc + (parseInt(m.qty as string) || 0), 0)} uni • {group.details.material === 'OUTRO' ? group.details.otherMaterial : (group.details.material || group.details.model || 'Sem specs')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {!isAdmin && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onCloneGroup(group); }}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                title="Duplicar Produto"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemoveGroup(group.id); }}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {group.isOpen ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
        </div>
      </div>

      {(group.isOpen || true) && (
        <div className={`p-6 space-y-8 ${!group.isOpen ? 'hidden print:block' : 'animate-in slide-in-from-top-2 duration-300'}`}>
          {!isAdmin && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 print:hidden">
              {[
                { id: "ESTORE_EXTERIOR", label: "Estore Ext.", icon: Box },
                { id: "ESTORE_INTERIOR", label: "Estore Int.", icon: Box },
                { id: "TOLDO", label: "Toldo", icon: Box },
                { id: "MOSQUITEIRO", label: "Mosquiteiro", icon: Box },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => onUpdateGroupType(group.id, type.id as ProductType)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                    group.type === type.id
                      ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                      : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <type.icon className="w-4 h-4" /> {type.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-4 print:gap-2">
            {group.type === "ESTORE_EXTERIOR" && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Material</label>
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 px-1">
                      {group.details.material === 'OUTRO' ? group.details.otherMaterial : group.details.material || '-'}
                    </div>
                  ) : (
                    <>
                      <div className="hidden print:block text-sm font-black text-slate-900 border-b border-slate-200 pb-1">{group.details.material === 'OUTRO' ? group.details.otherMaterial : group.details.material || '-'}</div>
                      <select 
                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all print:hidden disabled:bg-slate-50 disabled:text-slate-500"
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
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Especificar Material</label>
                    <input 
                      type="text"
                      placeholder="Descreva o material..."
                      className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none disabled:opacity-70"
                      value={group.details.otherMaterial}
                      disabled={isAdmin}
                      onChange={(e) => onUpdateGroupDetails(group.id, 'otherMaterial', e.target.value)}
                    />
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">RAL / Cor</label>
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 px-1">{group.details.ral || '-'}</div>
                  ) : (
                    <>
                      <div className="hidden print:block text-sm font-black text-slate-900 border-b border-slate-200 pb-1">{group.details.ral || '-'}</div>
                      <input 
                        type="text"
                        placeholder="Ex: 7016, Branco..."
                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none print:hidden disabled:bg-slate-50 disabled:text-slate-500"
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Modelo</label>
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 px-1">{group.details.model || '-'}</div>
                  ) : (
                    <>
                      <div className="hidden print:block text-sm font-black text-slate-900 border-b border-slate-200 pb-1">{group.details.model || '-'}</div>
                      {group.type === "ESTORE_INTERIOR" ? (
                          <select 
                            className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all print:hidden disabled:bg-slate-50 disabled:text-slate-500"
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
                          className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all print:hidden disabled:bg-slate-50 disabled:text-slate-500"
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
                          className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none print:hidden disabled:bg-slate-50 disabled:text-slate-500"
                          value={group.details.model}
                          disabled={isAdmin}
                          onChange={(e) => onUpdateGroupDetails(group.id, 'model', e.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tecido / Rede</label>
                  {isAdmin ? (
                    <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 px-1">{group.details.fabric || '-'}</div>
                  ) : (
                    <>
                      <div className="hidden print:block text-sm font-black text-slate-900 border-b border-slate-200 pb-1">{group.details.fabric || '-'}</div>
                      <input 
                        type="text"
                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none print:hidden disabled:bg-slate-50 disabled:text-slate-500"
                        value={group.details.fabric}
                        disabled={isAdmin}
                        onChange={(e) => onUpdateGroupDetails(group.id, 'fabric', e.target.value)}
                      />
                    </>
                  )}
                </div>
                {group.type !== "MOSQUITEIRO" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Referência</label>
                    {isAdmin ? (
                      <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 px-1">{group.details.reference || '-'}</div>
                    ) : (
                      <>
                        <div className="hidden print:block text-sm font-black text-slate-900 border-b border-slate-200 pb-1">{group.details.reference || '-'}</div>
                        <input 
                          type="text"
                          className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none print:hidden disabled:bg-slate-50 disabled:text-slate-500"
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Acionamento</label>
                {isAdmin ? (
                  <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 px-1">{group.details.activation || '-'}</div>
                ) : (
                  <>
                    <div className="hidden print:block text-sm font-black text-slate-900 border-b border-slate-200 pb-1">{group.details.activation || '-'}</div>
                    <select 
                      className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all print:hidden disabled:bg-slate-50 disabled:text-slate-500"
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Observações do Produto</label>
              {isAdmin ? (
                <div className="text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                  {group.details.observations || "Nenhuma observação registada."}
                </div>
              ) : (
                <>
                  <div className="hidden print:block text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                    {group.details.observations || "Nenhuma observação registada para este produto."}
                  </div>
                  <textarea 
                    placeholder="Ex: Pormenores de instalação..."
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all print:hidden disabled:bg-slate-50 disabled:text-slate-500"
                    rows={2}
                    value={group.details.observations}
                    disabled={isAdmin}
                    onChange={(e) => onUpdateGroupDetails(group.id, 'observations', e.target.value)}
                  />
                </>
              )}
            </div>
          </div>

          <MeasurementTable 
            group={group}
            isAdmin={isAdmin}
            onUpdateMeasurement={onUpdateMeasurement}
            onCloneRow={onCloneRow}
            onAddRow={onAddRow}
            onRemoveRow={onRemoveRow}
          />

        </div>
      )}
    </div>
  );
}
