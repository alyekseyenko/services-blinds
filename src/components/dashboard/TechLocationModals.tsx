"use client";

import { MapPin, X } from "lucide-react";
import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";

export function TechLocationConsentBanner({
  onOpenRgpd,
  onAccept,
  onDecline,
}: {
  onOpenRgpd: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="flex animate-in slide-in-from-top items-center gap-3 bg-ink px-4 py-3 text-ink-foreground shadow-lg duration-300">
      <MapPin className="h-5 w-5 shrink-0 text-primary-ink" />
      <div className="flex-1 text-xs font-semibold">
        <span>
          Deseja partilhar a sua localização durante o expediente para otimização de rotas e
          assistência em campo?
        </span>
        <button
          type="button"
          onClick={onOpenRgpd}
          className="ml-2 inline-flex items-center gap-0.5 text-xs font-bold text-primary-ink hover:underline"
        >
          (Mais Informações / RGPD)
        </button>
      </div>
      <button
        type="button"
        onClick={onAccept}
        className="min-h-12 whitespace-nowrap rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover"
      >
        Aceitar
      </button>
      <button
        type="button"
        onClick={onDecline}
        className="flex min-h-12 min-w-12 items-center justify-center text-muted-foreground transition-colors hover:text-ink-foreground"
        aria-label="Recusar partilha de localização"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TechRgpdModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-border-strong bg-card animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b-2 border-border-strong bg-ink p-5 text-ink-foreground">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-2 text-primary-ink">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="ds-title text-sm tracking-wide">Política de Privacidade & RGPD</h3>
              <p className="text-xs text-muted-foreground">Proteção de Dados & Telemetria em Campo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground transition-colors hover:bg-ink/90 hover:text-ink-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6 text-xs leading-relaxed text-muted-foreground">
          <div className="space-y-2 rounded-2xl border border-border/80 bg-muted p-4">
            <h4 className="text-xs font-black uppercase text-foreground">1. Finalidade do Processamento</h4>
            <p>
              As coordenadas GPS são utilizadas <strong>exclusivamente para a gestão operacional das rotas</strong>,
              atribuição de serviços urgentes na proximidade e estimativa precisa de chegada ao cliente.
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/80 bg-muted p-4">
            <h4 className="text-xs font-black uppercase text-foreground">2. Horários e Pausas Protegidas</h4>
            <p>
              A recolha de localização é <strong>automaticamente bloqueada</strong> fora do horário de expediente
              (antes das 07:00 e após as 22:00) e durante a pausa de almoço (13:00 às 14:00).
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/80 bg-muted p-4">
            <h4 className="text-xs font-black uppercase text-foreground">3. Retenção & Direito de Desconexão</h4>
            <p>
              A posição em tempo real expira após <strong>5 minutos</strong> de inatividade e é eliminada de imediato
              do mapa do gestor quando termina sessão ou fecha a aplicação.
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-success-border bg-success-surface p-4">
            <h4 className="text-xs font-black uppercase text-success-fg">4. Controlo Total do Utilizador</h4>
            <p className="text-success-fg">
              Pode ativar ou pausar a partilha de localização a qualquer instante através do botão{" "}
              <strong>GPS Ativo / GPS Pausado</strong> no cabeçalho da sua aplicação.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-ink px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-foreground transition-all hover:bg-ink/90"
          >
            Compreendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function persistLocationSharingDeclined(): void {
  localStorage.setItem(CLIENT_PREF_KEYS.LOCATION_SHARING, "false");
}