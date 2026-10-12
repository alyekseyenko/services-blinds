"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastContext";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TwentyAddressFields } from "@/components/ui/TwentyAddressFields";
import { TwentyPhoneField } from "@/components/ui/TwentyPhoneField";
import { cn } from "@/lib/cn";
import { createAdminClientAction } from "@/actions/admin-commercial-service-actions";
import {
  mapCreateAdminClientServerError,
  validateCreateAdminClientInput,
  type AdminClientFormFieldErrors,
} from "@/lib/admin/adminClientFormErrors";
import type {
  AdminClientSearchHit,
  AdminClientType,
  AdminPersonMorada,
} from "@/lib/schemas/adminCommercialService";

const fieldClass =
  "min-h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary";

const emptyMorada = (): AdminPersonMorada => ({
  addressStreet1: "",
  addressStreet2: "",
  addressCity: "",
  addressState: "",
  addressPostcode: "",
  addressCountry: "Portugal",
  addressLat: null,
  addressLng: null,
});

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-semibold text-danger-fg" role="alert">
      {message}
    </p>
  );
}

function fieldInputClass(hasError: boolean): string {
  return cn(fieldClass, hasError && "border-danger-border bg-danger-surface/30");
}

type Props = {
  initialFirstName?: string;
  onCreated: (client: AdminClientSearchHit) => void;
  onCancel?: () => void;
  submitLabel?: string;
  className?: string;
};

export default function AdminCreateClientForm({
  initialFirstName = "",
  onCreated,
  onCancel,
  submitLabel = "Guardar cliente",
  className,
}: Props) {
  const toast = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [clientType, setClientType] = useState<AdminClientType>("PARTICULAR");
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("PT");
  const [phoneNational, setPhoneNational] = useState("");
  const [morada, setMorada] = useState<AdminPersonMorada>(emptyMorada());
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AdminClientFormFieldErrors>({});
  const [formSummary, setFormSummary] = useState<string | null>(null);

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormSummary(null);
  }, []);

  const buildPayload = useCallback(
    () => ({
      clientType,
      firstName,
      lastName: lastName.trim() || undefined,
      nif: nif.replace(/\D/g, ""),
      email: email.trim() || undefined,
      phoneCountryCode,
      phoneNational,
      morada,
    }),
    [clientType, email, firstName, lastName, morada, nif, phoneCountryCode, phoneNational]
  );

  const showValidationErrors = useCallback(
    (errors: AdminClientFormFieldErrors, summary: string) => {
      setFieldErrors(errors);
      setFormSummary(summary);
      summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      toast.error("Dados incompletos", summary);
    },
    [toast]
  );

  const handleSubmit = async () => {
    setFieldErrors({});
    setFormSummary(null);

    const payload = buildPayload();
    const validation = validateCreateAdminClientInput(payload);
    if (!validation.ok) {
      showValidationErrors(validation.fieldErrors, validation.summary);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createAdminClientAction(validation.data);
      if (!res.success || !res.data) {
        const mapped = mapCreateAdminClientServerError(res.error || "Erro desconhecido.");
        showValidationErrors(mapped.fieldErrors, mapped.summary);
        return;
      }
      toast.success("Cliente criado", "O contacto foi guardado no Twenty CRM.");
      onCreated(res.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)} data-tour="admin-create-client-form">
      <p className="text-xs font-semibold text-muted-foreground">
        Particular ou empresa define o tipo no CRM; os restantes campos são iguais (nome, NIF,
        morada, contacto).
      </p>

      {formSummary ? (
        <div
          ref={summaryRef}
          className="rounded-xl border border-danger-border bg-danger-surface px-3 py-2.5"
          role="alert"
          aria-live="polite"
        >
          <p className="text-xs font-black uppercase tracking-wide text-danger-fg">
            Não foi possível guardar
          </p>
          <p className="mt-1 text-sm font-semibold text-danger-fg">{formSummary}</p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tipo de cliente
        </span>
        <SegmentedControl
          aria-label="Tipo de cliente"
          layout="grid"
          value={clientType}
          onChange={setClientType}
          options={[
            { value: "PARTICULAR", label: "Particular" },
            { value: "EMPRESA", label: "Empresa" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nome (obrigatório)
          </span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clearFieldError("firstName");
            }}
            className={fieldInputClass(Boolean(fieldErrors.firstName))}
            autoComplete="given-name"
            aria-invalid={Boolean(fieldErrors.firstName)}
            aria-describedby={fieldErrors.firstName ? "client-firstName-error" : undefined}
          />
          <FieldError id="client-firstName-error" message={fieldErrors.firstName} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Apelido
          </span>
          <input
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clearFieldError("lastName");
            }}
            className={fieldInputClass(Boolean(fieldErrors.lastName))}
            autoComplete="family-name"
            aria-invalid={Boolean(fieldErrors.lastName)}
            aria-describedby={fieldErrors.lastName ? "client-lastName-error" : undefined}
          />
          <FieldError id="client-lastName-error" message={fieldErrors.lastName} />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          NIF (obrigatório, 9 dígitos)
        </span>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{9}"
          maxLength={9}
          value={nif}
          onChange={(e) => {
            setNif(e.target.value.replace(/\D/g, "").slice(0, 9));
            clearFieldError("nif");
          }}
          className={fieldInputClass(Boolean(fieldErrors.nif))}
          placeholder="9 dígitos"
          aria-invalid={Boolean(fieldErrors.nif)}
          aria-describedby={fieldErrors.nif ? "client-nif-error" : undefined}
        />
        <FieldError id="client-nif-error" message={fieldErrors.nif} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          E-mail
        </span>
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
          }}
          className={fieldInputClass(Boolean(fieldErrors.email))}
          autoComplete="email"
          placeholder="Opcional"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "client-email-error" : undefined}
        />
        <FieldError id="client-email-error" message={fieldErrors.email} />
      </label>

      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Telemóvel (obrigatório)
        </span>
        <TwentyPhoneField
          countryCode={phoneCountryCode}
          nationalNumber={phoneNational}
          onCountryCodeChange={setPhoneCountryCode}
          onNationalNumberChange={(value) => {
            setPhoneNational(value);
            clearFieldError("phoneNational");
          }}
          error={fieldErrors.phoneNational}
        />
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Morada (ficha do cliente)
        </p>
        <TwentyAddressFields
          value={morada}
          onChange={(next) => {
            setMorada({ ...morada, ...next });
            if (next.addressStreet1 !== undefined) clearFieldError("morada.addressStreet1");
            if (next.addressCity !== undefined) clearFieldError("morada.addressCity");
          }}
          fieldErrors={{
            addressStreet1: fieldErrors["morada.addressStreet1"],
            addressCity: fieldErrors["morada.addressCity"],
          }}
        />
      </div>

      {fieldErrors.form ? (
        <FieldError id="client-form-error" message={fieldErrors.form} />
      ) : null}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" className="min-h-12" onClick={onCancel}>
            Voltar
          </Button>
        ) : null}
        <Button
          type="button"
          className="min-h-12"
          loading={submitting}
          loadingText="A guardar…"
          onClick={() => void handleSubmit()}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
