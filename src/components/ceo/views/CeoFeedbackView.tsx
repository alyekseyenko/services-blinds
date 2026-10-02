"use client";

import { Star } from "lucide-react";
import type { CeoMetrics } from "@/lib/schemas/ceoMetrics";

export interface CeoFeedbackViewProps {
  metrics: CeoMetrics;
}

export default function CeoFeedbackView({ metrics }: CeoFeedbackViewProps) {
  return (
    <>
{/* 6. VOZ DO CLIENTE */}
            <div className="brutal-panel rounded-2xl p-6 sm:p-8">
              <h3 className="ds-title mb-2 flex items-center gap-2 text-lg tracking-tight text-foreground">
                <Star className="w-5 h-5 text-warning-solid fill-warning-solid" />
                Voz do Cliente (Avaliações Recentes)
              </h3>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
                Notas e comentários atribuídos nas folhas de obra concluídas
              </p>

              {metrics.recentFeedback.length === 0 ? (
                <div className="text-center py-10 bg-card rounded-2xl border border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  Nenhuma avaliação submetida recentemente para o período selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.recentFeedback.map((fb) => (
                    <div 
                      key={fb.id}
                      className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-black text-sm text-foreground">{fb.clientName}</div>
                            {fb.nsi && (
                              <div className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                                NSI: #{fb.nsi}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star 
                                key={s} 
                                className={`w-3.5 h-3.5 ${s <= fb.rating ? "text-warning-solid fill-warning-solid" : "text-muted-foreground/40"}`} 
                              />
                            ))}
                          </div>
                        </div>

                        {fb.feedback && (
                          <p className="text-xs text-muted-foreground italic bg-muted p-3 rounded-xl border border-border">
                            &ldquo;{fb.feedback}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border text-xs font-bold text-muted-foreground text-right">
                        {fb.date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
    </>
  );
}
