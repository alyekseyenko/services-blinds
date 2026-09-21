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
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <h3 className="text-lg font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                Voz do Cliente (Avaliações Recentes)
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                Notas e comentários atribuídos nas folhas de obra concluídas
              </p>

              {metrics.recentFeedback.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Nenhuma avaliação submetida recentemente para o período selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.recentFeedback.map((fb) => (
                    <div 
                      key={fb.id}
                      className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-black text-sm text-[#090d16]">{fb.clientName}</div>
                            {fb.nsi && (
                              <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                NSI: #{fb.nsi}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star 
                                key={s} 
                                className={`w-3.5 h-3.5 ${s <= fb.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} 
                              />
                            ))}
                          </div>
                        </div>

                        {fb.feedback && (
                          <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                            &ldquo;{fb.feedback}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-400 text-right">
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
