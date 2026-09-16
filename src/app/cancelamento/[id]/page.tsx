"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { XCircle, Send, CheckCircle2, AlertTriangle, Home } from "lucide-react";
import { cancelAppointmentAction } from "@/actions/public-portal-actions";

export default function ClienteCancelamento() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Link de cancelamento inválido ou expirado.");
      return;
    }
    if (!reason.trim()) {
      setError("Por favor, indique o motivo do cancelamento.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await cancelAppointmentAction({
        taskId: id,
        token,
        reason,
      });
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error || "Ocorreu um erro ao processar o cancelamento.");
      }
    } catch (submitError) {
      console.error(submitError);
      setError("Erro técnico.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-3">Link inválido</h1>
          <p className="text-slate-600 text-sm">
            Este link de cancelamento expirou ou não é válido. Contacte a Habitarmos se precisar de ajuda.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Agendamento Cancelado</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            O seu pedido foi cancelado com sucesso. A nossa equipa foi notificada e entraremos em contacto se necessário.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.href = "https://habitarmos.pt";
            }}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" /> Voltar ao Site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-red-100 p-3 rounded-2xl">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cancelar Agendamento</h1>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-8 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Ao cancelar este agendamento, o horário será libertado. Por favor, indique o motivo para nos ajudar a melhorar o serviço.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Motivo do Cancelamento <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              minLength={10}
              maxLength={500}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
              placeholder="Ex: Não estarei em casa, surgiu um imprevisto..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-4.5 rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Confirmar Cancelamento
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
            Habitarmos - Assistência Técnica 2026
          </p>
        </form>
      </div>
    </div>
  );
}
