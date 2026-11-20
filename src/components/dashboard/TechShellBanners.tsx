"use client";

import ServerConnectionBanner from "@/components/ui/ServerConnectionBanner";
import { Button } from "@/components/ui/button";
import { TechLocationConsentBanner, TechRgpdModal } from "@/components/dashboard/TechLocationModals";

export function TechShellBanners(props: {
  showLocationConsent: boolean;
  showRgpdModal: boolean;
  locationSharingEnabled: boolean;
  onOpenRgpd: () => void;
  onCloseRgpd: () => void;
  onAcceptLocationConsent: () => void;
  onDeclineLocationConsent: () => void;
  isOnline: boolean;
  serverUnreachable: boolean;
  agendaDataStale: boolean;
  onRefreshAgenda: () => void;
}) {
  const {
    showLocationConsent,
    showRgpdModal,
    locationSharingEnabled,
    onOpenRgpd,
    onCloseRgpd,
    onAcceptLocationConsent,
    onDeclineLocationConsent,
    isOnline,
    serverUnreachable,
    agendaDataStale,
    onRefreshAgenda,
  } = props;

  return (
    <div className="z-50 shrink-0" data-tech-shell-chrome>
      {showLocationConsent ? (
        <TechLocationConsentBanner
          onOpenRgpd={onOpenRgpd}
          onAccept={onAcceptLocationConsent}
          onDecline={onDeclineLocationConsent}
        />
      ) : null}

      {showRgpdModal ? <TechRgpdModal onClose={onCloseRgpd} /> : null}

      {!isOnline ? (
        <div
          data-tour="tech-offline-banner"
          role="status"
          className="z-50 flex items-center justify-center border-b border-warning-solid/25 bg-warning-solid/10 px-3 py-1.5 text-center text-xs font-semibold text-warning-fg dark:text-warning-fg"
        >
          Sem rede — agenda e alterações ficam guardadas neste telemóvel até voltar a ligar.
        </div>
      ) : (
        <ServerConnectionBanner visible={serverUnreachable} />
      )}
      {isOnline && agendaDataStale && (
        <button
          type="button"
          onClick={onRefreshAgenda}
          className="flex min-h-12 w-full items-center justify-center gap-2 bg-danger-solid/95 px-3 py-2 text-xs font-bold text-ink-foreground shadow-md active:bg-danger-solid/90"
        >
          Dados da agenda possivelmente desatualizados — toque para atualizar
        </button>
      )}
    </div>
  );
}

export function TechAgendaLoadFailure(props: {
  isOnline: boolean;
  onRetry: () => void;
}) {
  const { isOnline, onRetry } = props;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      {!isOnline ? (
        <>
          <p className="text-sm font-black uppercase tracking-tight text-foreground">
            Modo offline — sem agenda local
          </p>
          <p className="max-w-sm text-sm font-semibold text-muted-foreground">
            Não há visitas guardadas neste telemóvel. Abra a app com rede pelo menos uma vez para
            descarregar a agenda; depois pode trabalhar offline.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-black uppercase tracking-tight text-foreground">
            Falha ao sincronizar
          </p>
          <p className="max-w-sm text-sm font-semibold text-muted-foreground">
            Não foi possível carregar as visitas. Verifique a rede e tente novamente.
          </p>
          <Button onClick={onRetry}>Tentar novamente</Button>
        </>
      )}
    </div>
  );
}
