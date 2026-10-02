"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { XCircle, Send, CheckCircle2, AlertTriangle, Home } from "lucide-react";
import { cancelAppointmentAction } from "@/actions/public-portal-actions";
import { COMPANY_LABEL, COMPANY_WEBSITE } from "@/lib/branding";

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
      <div className="min-h-screen brutal-grid-bg bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full brutal-panel rounded-2xl p-10 text-center border-2 border-border-strong">
          <AlertTriangle className="w-12 h-12 text-warning-solid mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-3">Link inválido</h1>
          <p className="text-muted-foreground text-sm">
            Este link de cancelamento expirou ou não é válido. Contacte {COMPANY_LABEL} se precisar de ajuda.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen brutal-grid-bg bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full brutal-panel rounded-2xl p-10 text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-success-surface rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success-solid" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Agendamento Cancelado</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            O seu pedido foi cancelado com sucesso. A nossa equipa foi notificada e entraremos em contacto se necessário.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.href = COMPANY_WEBSITE;
            }}
            className="w-full bg-ink text-ink-foreground font-bold py-4 rounded-2xl hover:bg-ink/90 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" /> Voltar ao site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen brutal-grid-bg bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full brutal-panel rounded-2xl p-8 md:p-10 border-2 border-border-strong">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-danger-surface p-3 rounded-2xl">
            <XCircle className="w-6 h-6 text-danger-solid" />
          </div>
          <h1 className="ds-title text-2xl tracking-tight text-foreground">Cancelar Agendamento</h1>
        </div>

        <div className="bg-warning-surface border border-warning-border rounded-2xl p-4 mb-8 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-solid shrink-0 mt-0.5" />
          <p className="text-xs text-warning-fg font-medium leading-relaxed">
            Ao cancelar este agendamento, o horário será libertado. Por favor, indique o motivo para nos ajudar a melhorar o serviço.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 ml-1">
              Motivo do Cancelamento <span className="text-danger-solid">*</span>
            </label>
            <textarea
              required
              rows={4}
              minLength={10}
              maxLength={500}
              className="w-full bg-muted border border-border rounded-2xl p-4 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted-foreground font-medium"
              placeholder="Ex: Não estarei em casa, surgiu um imprevisto..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-danger-solid bg-danger-surface border border-danger-border rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-danger-solid text-ink-foreground font-bold py-4.5 rounded-2xl hover:bg-danger-solid/90 transition-all shadow-xl shadow-danger-border/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                A processar...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Confirmar Cancelamento
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground font-bold uppercase tracking-widest pt-2">
            {COMPANY_LABEL} — Assistência Técnica
          </p>
        </form>
      </div>
    </div>
  );
}
