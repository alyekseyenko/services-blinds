"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Star, Send, CheckCircle2, MessageSquare, Heart, AlertTriangle } from "lucide-react";
import { submitEvaluationAction } from "@/actions/public-portal-actions";
import { COMPANY_LABEL, COMPANY_WEBSITE } from "@/lib/branding";

export default function ClienteAvaliacao() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Link de avaliação inválido ou expirado.");
      return;
    }
    if (rating === 0) {
      setError("Por favor, selecione uma avaliação de 1 a 5 estrelas.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await submitEvaluationAction({
        opportunityId: id,
        token,
        rating,
        feedback,
      });
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error || "Ocorreu um erro ao submeter a sua avaliação.");
      }
    } catch (submitError) {
      console.error(submitError);
      setError("Erro técnico ao processar avaliação.");
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
            Este link de avaliação expirou ou não é válido. Contacte {COMPANY_LABEL} se precisar de ajuda.
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
          <h1 className="text-2xl font-bold text-foreground mb-4">Obrigado pelo seu comentário!</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            A sua opinião é fundamental para mantermos a excelência nos nossos serviços.
          </p>
          <div className="flex justify-center gap-1 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${star <= rating ? "text-warning-solid fill-warning-solid" : "text-muted-foreground/40"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = COMPANY_WEBSITE;
            }}
            className="w-full bg-ink text-ink-foreground font-bold py-4 rounded-2xl hover:bg-ink/90 transition-all flex items-center justify-center gap-2"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen brutal-grid-bg bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full brutal-panel rounded-2xl p-8 md:p-10 border-2 border-border-strong">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-info-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-info-solid" />
          </div>
          <h1 className="ds-title mb-2 text-2xl tracking-tight text-foreground">Avalie o nosso Serviço</h1>
          <p className="text-muted-foreground text-sm font-medium">Como foi a sua experiência com o nosso técnico?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex flex-col items-center">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform active:scale-90 focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 transition-colors duration-200 ${
                      star <= (hover || rating) ? "text-warning-solid fill-warning-solid" : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-warning-solid text-xs font-bold uppercase tracking-widest mt-3 animate-in fade-in duration-300">
                {rating === 5
                  ? "Excelente!"
                  : rating === 4
                    ? "Muito bom"
                    : rating === 3
                      ? "Bom"
                      : rating === 2
                        ? "Razoável"
                        : "Pode melhorar"}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 ml-1">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-bold text-foreground">Comentários Adicionais</label>
            </div>
            <textarea
              rows={4}
              maxLength={2000}
              className="w-full bg-muted border border-border rounded-2xl p-4 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted-foreground font-medium"
              placeholder="Conte-nos um pouco mais sobre o atendimento..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-danger-solid bg-danger-surface border border-danger-border rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full bg-ink text-ink-foreground font-bold py-4.5 rounded-2xl hover:bg-ink/90 transition-all shadow-xl shadow-ink/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                A submeter...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Submeter Avaliação
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
            {COMPANY_LABEL} — Qualidade e Confiança
          </p>
        </form>
      </div>
    </div>
  );
}
