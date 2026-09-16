"use client";
import React, { useState } from "react";
import { Plus, Trash2, Ruler, Zap, Download, Printer, Loader2 } from "lucide-react";
import { Task } from "@/types";
import { useMeasurements } from "@/hooks/useMeasurements";
import { ProductGroupCard } from "./ProductGroupCard";

import { useToast } from "@/components/ui/ToastContext";

interface MeasurementsFormProps {
  task?: Task;
  onSave?: (data: any) => Promise<{ success: boolean; error?: string }>;
  isAdmin?: boolean;
}

export default function MeasurementsForm({ task, onSave, isAdmin = false }: MeasurementsFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const {
    productGroups,
    lastLocalSave,
    DRAFT_KEY,
    addGroup,
    cloneGroup,
    removeGroup,
    toggleGroup,
    updateGroupType,
    updateGroupDetails,
    cloneRow,
    addRow,
    removeRow,
    updateMeasurement,
    clearDraft,
    setLastLocalSave
  } = useMeasurements(task);

  const handleSave = async () => {
    if (!onSave) return;
    setLoading(true);
    try {
      const data = {
        groups: productGroups,
        updatedAt: new Date().toISOString()
      };
      
      const result = await onSave(data);
      
      if (result && result.success) {
        clearDraft();
        setLastLocalSave(null); 
        toast.success("Medições Guardadas!", "As medições e itens foram sincronizados com o Twenty CRM.");
      } else {
        throw new Error(result?.error || "O servidor não confirmou a gravação.");
      }
    } catch (e: any) {
      toast.warning(
        "Rascunho Protegido", 
        "Erro de ligação com o servidor. O rascunho continua guardado no telemóvel por segurança."
      );
    } finally {
      setLoading(false);
    }
  };

  const getProductLabel = (type: string) => {
    const labels: Record<string, string> = {
      ESTORE_EXTERIOR: "Estore Exterior",
      ESTORE_INTERIOR: "Estore Interior",
      TOLDO: "Toldo",
      MOSQUITEIRO: "Mosquiteiro"
    };
    return labels[type] || type;
  };

  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Produto,Material/Modelo,RAL/Cor,Tecido,Referencia,Acionamento,Quantidade,Largura(mm),Altura(mm),Fixacao,Comandos,Notas,Preco\n";
    
    productGroups.forEach(g => {
      const type = getProductLabel(g.type);
      const material = g.details.material === 'OUTRO' ? g.details.otherMaterial : (g.details.material || g.details.model);
      
      g.measurements.forEach(m => {
        const row = [
          type,
          material,
          g.details.ral || "",
          g.details.fabric || "",
          g.details.reference || "",
          g.details.activation || "",
          m.qty,
          m.width,
          m.height,
          m.fixation || "",
          m.controls || "",
          m.notes || "",
          m.price || ""
        ].map(val => `"${val}"`).join(",");
        csvContent += row + "\n";
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Medicoes_NSI_${task?.nsi || 'N-A'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe check for localStorage (needs to run in client)
  const hasDraft = typeof window !== "undefined" && localStorage.getItem(DRAFT_KEY);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Profissional para Impressão */}
      <div className="hidden print:block border-b-4 border-slate-900 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Ficha Técnica de Medição</h1>
            <p className="text-xl font-bold text-slate-500 mt-1 uppercase tracking-widest">Habitarmos - Soluções para Janelas</p>
          </div>
          <div className="text-right">
            <div className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xl font-black">NSI #{task?.nsi || 'N/A'}</div>
            <p className="text-sm font-bold text-slate-500 mt-2">{new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 mt-10 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
            <p className="text-2xl font-black text-slate-900">{task?.client || 'Não especificado'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local da Obra</p>
            <p className="text-lg font-bold text-slate-700">{task?.address || 'Não especificado'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Ruler className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Gestão de Medidas</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-bold">Relatório Técnico</span>
              {lastLocalSave && !isAdmin && (
                <span className="text-[9px] bg-emerald-100/80 text-emerald-700 px-2 py-0.5 rounded-lg font-bold">
                   Auto-guardado às {lastLocalSave}
                </span>
              )}
              {!isAdmin && hasDraft && !lastLocalSave && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg font-black uppercase animate-pulse flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-amber-500" /> Rascunho Ativo
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
             {isAdmin && (
              <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                {hasDraft && task && (!task.report || !task.report.includes("[MEASUREMENTS]")) && (
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-md animate-pulse"
                    title="Enviar medidas que ficaram esquecidas no telemóvel"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4" />}
                    Sincronizar
                  </button>
                )}
                <button 
                  onClick={exportToExcel}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all text-xs font-black uppercase tracking-wider"
                  title="Exportar para Excel (.csv)"
                >
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-all text-xs font-black uppercase tracking-wider"
                  title="Gerar PDF Profissional"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
              </div>
            )}
            {!isAdmin && onSave && (
              <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#84cc16] hover:bg-[#74be12] text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4 text-slate-900" />}
                  Guardar
                </button>
                <button 
                  onClick={addGroup}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4 text-[#84cc16]" /> Novo Prod.
                </button>
              </div>
            )}
        </div>
      </div>

      <div className="space-y-4 print:space-y-12">
        {productGroups.map((group, gIdx) => (
          <ProductGroupCard 
            key={group.id}
            group={group}
            gIdx={gIdx}
            isAdmin={isAdmin}
            onToggleGroup={toggleGroup}
            onCloneGroup={cloneGroup}
            onRemoveGroup={removeGroup}
            onUpdateGroupType={updateGroupType}
            onUpdateGroupDetails={updateGroupDetails}
            onUpdateMeasurement={updateMeasurement}
            onCloneRow={cloneRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />
        ))}
      </div>
    </div>
  );
}
