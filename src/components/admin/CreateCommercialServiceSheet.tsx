"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, User } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { TwentyAddressFields } from "@/components/ui/TwentyAddressFields";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastContext";
import { cn } from "@/lib/cn";
import type {
  AdminClientSearchHit,
  AdminCommercialServiceType,
  AdminServiceAddress,
} from "@/lib/schemas/adminCommercialService";
import { ADMIN_COMMERCIAL_SERVICE_OPTIONS } from "@/lib/adminCommercialServiceOptions";
import {
  createAdminCommercialServiceAction,
  getAdminClientServiceAddressAction,
  searchAdminClientsAction,
} from "@/actions/admin-commercial-service-actions";
import type { Opportunity } from "@/types/admin";

const emptyAddress = (): AdminServiceAddress => ({
  addressStreet1: "",
  addressStreet2: "",
  addressCity: "",
  addressState: "",
  addressPostcode: "",
  addressCountry: "Portugal",
  addressLat: null,
  addressLng: null,
});

const fieldClass =
  "min-h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (opportunity: Opportunity, options?: { openSchedule?: boolean }) => void;
};

export default function CreateCommercialServiceSheet({ open, onClose, onCreated }: Props) {
  const toast = useToast();
  const clientRequestId = useMemo(() => crypto.randomUUID(), []);

  const [clientQuery, setClientQuery] = useState("");
  const [clientHits, setClientHits] = useState<AdminClientSearchHit[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AdminClientSearchHit | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [address, setAddress] = useState<AdminServiceAddress>(emptyAddress());
  const [serviceType, setServiceType] = useState<AdminCommercialServiceType | null>(null);
  const [nsi, setNsi] = useState("");
  const [titleSuffix, setTitleSuffix] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setClientQuery("");
    setClientHits([]);
    setSelectedClient(null);
    setAddress(emptyAddress());
    setServiceType(null);
    setNsi("");
    setTitleSuffix("");
    setNotes("");
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    const q = clientQuery.trim();
    if (q.length < 2 || selectedClient) {
      setClientHits([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setClientLoading(true);
      void searchAdminClientsAction(q)
        .then((res) => {
          if (res.success && res.data) setClientHits(res.data);
          else setClientHits([]);
        })
        .finally(() => setClientLoading(false));
    }, 300);

    return () => window.clearTimeout(handle);
  }, [clientQuery, open, selectedClient]);

  const pickClient = async (client: AdminClientSearchHit) => {
    setSelectedClient(client);
    setClientQuery(client.displayName);
    setClientHits([]);
    setAddressLoading(true);
    const res = await getAdminClientServiceAddressAction(client.id);
    setAddressLoading(false);
    if (res.success && res.data) {
      setAddress(res.data);
    } else if (!res.success) {
      toast.error("Morada", res.error || "Não foi possível carregar a morada.");
      setAddress(emptyAddress());
    } else {
      setAddress(emptyAddress());
    }
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientQuery("");
    setAddress(emptyAddress());
  };

  const handleSubmit = async (openScheduleAfter: boolean) => {
    if (!selectedClient) {
      toast.error("Selecione um cliente do Twenty CRM.");
      return;
    }
    if (!serviceType) {
      toast.error("Selecione o tipo de serviço.");
      return;
    }
    if (!address.addressStreet1.trim() || !address.addressCity.trim()) {
      toast.error("Morada incompleta", "Indique rua e localidade do serviço.");
      return;
    }

    const nsiTrim = nsi.trim();
    if (nsiTrim && (!/^\d+$/.test(nsiTrim) || Number(nsiTrim) <= 0)) {
      toast.error("NSI inválido", "Indique um número inteiro positivo ou deixe em branco.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createAdminCommercialServiceAction({
        clientRequestId,
        personId: selectedClient.id,
        serviceType,
        nsi: nsiTrim ? Number(nsiTrim) : undefined,
        titleSuffix: titleSuffix.trim() || undefined,
        address,
        notes: notes.trim() || undefined,
      });
      if (!res.success || !res.data) {
        toast.error("Não foi possível criar", res.error || "Erro desconhecido.");
        return;
      }
      toast.success(
        "Serviço criado",
        openScheduleAfter
          ? "Pode agendar a visita técnica a seguir."
          : "O serviço já está no mapa e na lista."
      );
      onCreated(res.data.opportunity, { openSchedule: openScheduleAfter });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Novo serviço"
      description="Morada base do contacto no Twenty. Ao alterar aqui, só este serviço é atualizado — o CRM não muda."
      side="right"
      priority="elevated"
      panelDataTour="admin-create-service-sheet"
      className="max-w-lg"
    >
      <div className="flex flex-col px-4 pb-6 pt-4">
        <section
          className="space-y-3 border-b border-border pb-6"
          data-tour="admin-create-service-client"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</p>
          {selectedClient ? (
            <div className="flex items-start justify-between gap-2 rounded-xl border-2 border-border bg-muted/50 p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-black text-foreground">
                  <User className="h-4 w-4 shrink-0 text-primary-ink" aria-hidden />
                  {selectedClient.displayName}
                </p>
                {selectedClient.email ? (
                  <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
                    {selectedClient.email}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={clearClient}
                className="shrink-0 text-xs font-bold text-primary-ink underline"
              >
                Alterar
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Nome ou e-mail do cliente…"
                  className={cn(fieldClass, "pl-10")}
                  autoComplete="off"
                />
                {clientLoading ? (
                  <Loader2
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                ) : null}
              </div>
              {clientHits.length > 0 ? (
                <ul className="max-h-48 overflow-y-auto rounded-xl border border-border bg-card">
                  {clientHits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => void pickClient(hit)}
                        className="flex w-full flex-col gap-0.5 px-3 py-3 text-left hover:bg-muted"
                      >
                        <span className="text-sm font-bold text-foreground">{hit.displayName}</span>
                        {hit.email ? (
                          <span className="text-xs text-muted-foreground">{hit.email}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {clientQuery.trim().length >= 2 && !clientLoading && clientHits.length === 0 ? (
                <p className="text-xs font-semibold text-muted-foreground">
                  Nenhum cliente encontrado. Crie o contacto no Twenty CRM primeiro.
                </p>
              ) : null}
            </>
          )}
        </section>

        <section
          className="space-y-3 border-b border-border py-6"
          data-tour="admin-create-service-type"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tipo de serviço
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ADMIN_COMMERCIAL_SERVICE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => setServiceType(opt.type)}
                className={cn(
                  "min-h-12 rounded-xl border-2 px-3 py-2 text-left text-sm font-bold transition-colors",
                  serviceType === opt.type
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-bold text-muted-foreground">Detalhes opcionais</p>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                NSI
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={nsi}
                onChange={(e) => setNsi(e.target.value.replace(/\D/g, ""))}
                placeholder="Número do serviço (opcional)"
                className={fieldClass}
              />
              <span className="block text-xs font-medium leading-snug text-muted-foreground">
                Em branco: o Twenty atribui o próximo NSI.
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Referência no título
              </span>
              <input
                type="text"
                value={titleSuffix}
                onChange={(e) => setTitleSuffix(e.target.value)}
                placeholder="Ex.: morada ou obra"
                className={fieldClass}
              />
            </label>
          </div>
        </section>

        <section
          className="space-y-3 border-b border-border py-6"
          data-tour="admin-create-service-address"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Morada do serviço
            </p>
            {addressLoading ? (
              <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                A carregar morada do cliente…
              </p>
            ) : null}
          </div>
          <TwentyAddressFields
            value={address}
            onChange={(next) => setAddress((prev) => ({ ...prev, ...next }))}
            disabled={addressLoading}
          />
        </section>

        <section className="space-y-2 py-6">
          <label
            htmlFor="admin-create-service-notes"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Notas internas
          </label>
          <textarea
            id="admin-create-service-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexto para a equipa (opcional)"
            className={cn(fieldClass, "min-h-24 resize-none")}
          />
        </section>

        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t-2 border-border-strong bg-card px-4 py-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 flex-1 font-bold"
            disabled={submitting}
            onClick={() => void handleSubmit(false)}
          >
            {submitting ? "A criar…" : "Criar serviço"}
          </Button>
          <Button
            type="button"
            className="min-h-12 flex-1 font-bold"
            disabled={submitting}
            onClick={() => void handleSubmit(true)}
            data-tour="admin-create-service-schedule"
          >
            Criar e agendar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
