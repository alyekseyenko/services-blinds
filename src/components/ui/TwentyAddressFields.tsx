"use client";

import { cn } from "@/lib/cn";

/** Values aligned with Twenty `Address` / `morada` / `moradaDeServico` fields. */
export type TwentyAddressFieldValues = {
  addressStreet1: string;
  addressStreet2?: string;
  addressCity: string;
  addressState?: string;
  addressPostcode?: string;
  addressCountry: string;
};

/** Country strings as stored in Twenty (English names). */
export const TWENTY_ADDRESS_COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "Portugal", label: "Portugal" },
  { value: "Spain", label: "Espanha" },
  { value: "France", label: "França" },
  { value: "United Kingdom", label: "Reino Unido" },
  { value: "Germany", label: "Alemanha" },
  { value: "Brazil", label: "Brasil" },
];

const inputClass =
  "min-h-11 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-border-strong focus:bg-card";

type AddressFieldErrorKey = "addressStreet1" | "addressCity";

type Props = {
  value: TwentyAddressFieldValues;
  onChange: (next: TwentyAddressFieldValues) => void;
  className?: string;
  disabled?: boolean;
  fieldErrors?: Partial<Record<AddressFieldErrorKey, string>>;
};

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="text-xs font-medium text-muted-foreground">{children}</span>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-semibold text-danger-fg" role="alert">
      {message}
    </p>
  );
}

export function TwentyAddressFields({
  value,
  onChange,
  className,
  disabled,
  fieldErrors,
}: Props) {
  const patch = (partial: Partial<TwentyAddressFieldValues>) =>
    onChange({ ...value, ...partial });

  const country = value.addressCountry || "Portugal";
  const countryInList = TWENTY_ADDRESS_COUNTRY_OPTIONS.some((o) => o.value === country);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <FieldLabel>Endereço 1</FieldLabel>
        <input
          type="text"
          disabled={disabled}
          value={value.addressStreet1}
          onChange={(e) => patch({ addressStreet1: e.target.value })}
          className={cn(
            inputClass,
            fieldErrors?.addressStreet1 && "border-danger-border bg-danger-surface/30"
          )}
          autoComplete="address-line1"
          aria-invalid={Boolean(fieldErrors?.addressStreet1)}
          aria-describedby={fieldErrors?.addressStreet1 ? "morada-street-error" : undefined}
        />
        <FieldError id="morada-street-error" message={fieldErrors?.addressStreet1} />
      </div>

      <div className="space-y-1">
        <FieldLabel>Endereço 2</FieldLabel>
        <input
          type="text"
          disabled={disabled}
          value={value.addressStreet2 || ""}
          onChange={(e) => patch({ addressStreet2: e.target.value })}
          className={inputClass}
          autoComplete="address-line2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <FieldLabel>Cidade</FieldLabel>
          <input
            type="text"
            disabled={disabled}
            value={value.addressCity}
            onChange={(e) => patch({ addressCity: e.target.value })}
            className={cn(
              inputClass,
              fieldErrors?.addressCity && "border-danger-border bg-danger-surface/30"
            )}
            autoComplete="address-level2"
            aria-invalid={Boolean(fieldErrors?.addressCity)}
            aria-describedby={fieldErrors?.addressCity ? "morada-city-error" : undefined}
          />
          <FieldError id="morada-city-error" message={fieldErrors?.addressCity} />
        </div>
        <div className="space-y-1">
          <FieldLabel>Estado</FieldLabel>
          <input
            type="text"
            disabled={disabled}
            value={value.addressState || ""}
            onChange={(e) => patch({ addressState: e.target.value })}
            className={inputClass}
            autoComplete="address-level1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <FieldLabel>Código postal</FieldLabel>
          <input
            type="text"
            disabled={disabled}
            autoComplete="postal-code"
            value={value.addressPostcode || ""}
            onChange={(e) => patch({ addressPostcode: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>País</FieldLabel>
          {countryInList ? (
            <select
              disabled={disabled}
              value={country}
              onChange={(e) => patch({ addressCountry: e.target.value })}
              className={cn(inputClass, "appearance-none")}
            >
              {TWENTY_ADDRESS_COUNTRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              disabled={disabled}
              value={country}
              onChange={(e) => patch({ addressCountry: e.target.value })}
              className={inputClass}
              autoComplete="country-name"
            />
          )}
        </div>
      </div>
    </div>
  );
}
