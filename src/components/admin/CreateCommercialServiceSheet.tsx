"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, User } from "lucide-react";
import { FormAlert } from "@/components/ui/FormAlert";
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
import AdminCreateClientForm from "@/components/admin/AdminCreateClientForm";
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

type ServiceFormErrors = {
  client?: string;
  serviceType?: string;
  addressStreet1?: string;
  addressCity?: string;
  nsi?: string;
  form?: string;
};

function serviceErrorMessages(errors: ServiceFormErrors): string[] {
  const seen = new Set<string>();
  const messages: string[] = [];
  for (const message of Object.values(errors)) {
    if (!message || seen.has(message)) continue;
    seen.add(message);
    messages.push(message);
  }
  return messages;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-semibold text-danger-fg" role="alert">
      {message}
    </p>
  );
}

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
  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<ServiceFormErrors>({});
  const [errorTick, setErrorTick] = useState(0);
  const formErrorsRef = useRef(formErrors);
  const alertRef = useRef<HTMLDivElement>(null);
  const clientSectionRef = useRef<HTMLElement>(null);
  const typeSectionRef = useRef<HTMLElement>(null);
  const addressSectionRef = useRef<HTMLElement>(null);
  const nsiFieldRef = useRef<HTMLLabelElement>(null);
  formErrorsRef.current = formErrors;

  const resetForm = useCallback(() => {
    setClientCreateOpen(false);
    setClientQuery("");
    setClientHits([]);
    setSelectedClient(null);
    setAddress(emptyAddress());
    setServiceType(null);
    setNsi("");
    setTitleSuffix("");
    setNotes("");
    setFormErrors({});
  }, []);

  const clearError = useCallback((key: keyof ServiceFormErrors) => {
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const publishErrors = useCallback(
    (errors: ServiceFormErrors, title: string) => {
      const messages = serviceErrorMessages(errors);
      setFormErrors(errors);
      setErrorTick((tick) => tick + 1);
      toast.error(title, messages.join(" · ") || "Verifique os dados do formulário.");
    },
    [toast]
  );

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (errorTick === 0) return;
    const errors = formErrorsRef.current;
    const target = errors.client
      ? clientSectionRef.current
      : errors.serviceType
        ? typeSectionRef.current
        : errors.nsi
          ? nsiFieldRef.current
          : errors.addressStreet1 || errors.addressCity
            ? addressSectionRef.current
            : alertRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errorTick]);

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
    clearError("client");
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
    setClientCreateOpen(false);
    setAddress(emptyAddress());
  };

  const guessFirstNameFromQuery = (query: string): string => {
    const q = query.trim();
    if (!q || q.includes("@")) return "";
    return q.split(/\s+/)[0] || "";
  };

  const handleSubmit = async (openScheduleAfter: boolean) => {
    const errors: ServiceFormErrors = {};
    if (!selectedClient) {
      errors.client = "Selecione ou crie um cliente.";
    }
    if (!serviceType) {
      errors.serviceType = "Selecione o tipo de serviço.";
    }
    if (!address.addressStreet1.trim()) {
      errors.addressStreet1 = "Indique a rua do serviço.";
    }
    if (!address.addressCity.trim()) {
      errors.addressCity = "Indique a localidade do serviço.";
    }

    const nsiTrim = nsi.trim();
    if (nsiTrim && (!/^\d+$/.test(nsiTrim) || Number(nsiTrim) <= 0)) {
      errors.nsi = "Indique um número inteiro positivo ou deixe o NSI em branco.";
    }

    if (!selectedClient || !serviceType || serviceErrorMessages(errors).length > 0) {
      publishErrors(errors, "Dados por corrigir");
      return;
    }

    setFormErrors({});

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
        publishErrors(
          { form: res.error || "Erro desconhecido." },
          "Não foi possível criar"
        );
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
          ref={clientSectionRef}
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
          ) : clientCreateOpen ? (
            <AdminCreateClientForm
              initialFirstName={guessFirstNameFromQuery(clientQuery)}
              pinActions={false}
              onCreated={(client) => {
                setClientCreateOpen(false);
                clearError("client");
                void pickClient(client);
              }}
              onCancel={() => setClientCreateOpen(false)}
              submitLabel="Criar e continuar"
            />
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
                  onChange={(e) => {
                    setClientQuery(e.target.value);
                    clearError("client");
                  }}
                  placeholder="Nome ou e-mail do cliente…"
                  className={cn(
                    fieldClass,
                    "pl-10",
                    formErrors.client && "border-danger-border bg-danger-surface/40"
                  )}
                  autoComplete="off"
                  aria-invalid={Boolean(formErrors.client)}
                  aria-describedby={formErrors.client ? "service-client-error" : undefined}
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
                <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Nenhum cliente encontrado com esta pesquisa.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 w-full"
                    data-tour="admin-create-service-new-client"
                    onClick={() => setClientCreateOpen(true)}
                  >
                    Criar cliente
                  </Button>
                </div>
              ) : null}
              {clientQuery.trim().length >= 2 && clientHits.length > 0 ? (
                <button
                  type="button"
                  className="text-xs font-bold text-primary-ink underline"
                  onClick={() => setClientCreateOpen(true)}
                >
                  Criar cliente novo
                </button>
              ) : null}
            </>
          )}
          <FieldError id="service-client-error" message={formErrors.client} />
        </section>

        <section
          ref={typeSectionRef}
          className="space-y-3 border-b border-border py-6"
          data-tour="admin-create-service-type"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tipo de serviço
          </p>
          <div
            className={cn(
              "grid grid-cols-1 gap-2 sm:grid-cols-2",
              formErrors.serviceType && "rounded-xl border-2 border-danger-border bg-danger-surface/30 p-2"
            )}
            role="group"
            aria-invalid={Boolean(formErrors.serviceType)}
            aria-describedby={formErrors.serviceType ? "service-type-error" : undefined}
          >
            {ADMIN_COMMERCIAL_SERVICE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => {
                  setServiceType(opt.type);
                  clearError("serviceType");
                }}
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
          <FieldError id="service-type-error" message={formErrors.serviceType} />
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-bold text-muted-foreground">Detalhes opcionais</p>
            <label ref={nsiFieldRef} className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                NSI
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={nsi}
                onChange={(e) => {
                  setNsi(e.target.value.replace(/\D/g, ""));
                  clearError("nsi");
                }}
                placeholder="NSI (opcional)"
                className={cn(
                  fieldClass,
                  formErrors.nsi && "border-danger-border bg-danger-surface/40"
                )}
                aria-invalid={Boolean(formErrors.nsi)}
                aria-describedby={formErrors.nsi ? "service-nsi-error" : undefined}
              />
              <FieldError id="service-nsi-error" message={formErrors.nsi} />
              <span className="block text-xs font-medium leading-snug text-muted-foreground">
                O NSI continua manual. O número de serviço é outro campo e o Twenty atribui-o sozinho.
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
          ref={addressSectionRef}
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
            onChange={(next) => {
              setAddress((prev) => ({ ...prev, ...next }));
              if (next.addressStreet1 !== address.addressStreet1) clearError("addressStreet1");
              if (next.addressCity !== address.addressCity) clearError("addressCity");
            }}
            disabled={addressLoading}
            fieldErrors={{
              addressStreet1: formErrors.addressStreet1,
              addressCity: formErrors.addressCity,
            }}
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

        <div
          ref={alertRef}
          className="sticky bottom-0 z-10 -mx-4 space-y-3 border-t-2 border-border-strong bg-card px-4 py-4"
        >
          <FormAlert
            title={formErrors.form ? "Não foi possível criar" : "Dados por corrigir"}
            messages={serviceErrorMessages(formErrors)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
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
      </div>
    </Sheet>
  );
}
