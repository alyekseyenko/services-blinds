"use client";

import { cn } from "@/lib/cn";
import {
  TWENTY_PHONE_COUNTRIES,
  formatTwentyPhoneNationalDigits,
} from "@/lib/twentyPhoneCountries";

const inputClass =
  "min-h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary";

type Props = {
  countryCode: string;
  nationalNumber: string;
  onCountryCodeChange: (code: string) => void;
  onNationalNumberChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
};

export function TwentyPhoneField({
  countryCode,
  nationalNumber,
  onCountryCodeChange,
  onNationalNumberChange,
  disabled,
  className,
  error,
}: Props) {
  return (
    <div className={cn("space-y-1", className)}>
    <div className="flex gap-2">
      <label className="relative shrink-0">
        <span className="sr-only">País do telefone</span>
        <select
          disabled={disabled}
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className={cn(
            inputClass,
            "w-[7.25rem] appearance-none pr-8 text-base font-bold"
          )}
        >
          {TWENTY_PHONE_COUNTRIES.map((c) => (
            <option key={c.countryCode} value={c.countryCode}>
              {c.flag} {c.callingCode}
            </option>
          ))}
        </select>
      </label>
      <input
        type="tel"
        inputMode="tel"
        disabled={disabled}
        value={nationalNumber}
        onChange={(e) => onNationalNumberChange(formatTwentyPhoneNationalDigits(e.target.value))}
        className={cn(
          inputClass,
          "min-w-0 flex-1",
          error && "border-danger-border bg-danger-surface/30"
        )}
        autoComplete="tel-national"
        placeholder="912345678"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "phone-national-error" : undefined}
      />
    </div>
    {error ? (
      <p id="phone-national-error" className="text-xs font-semibold text-danger-fg" role="alert">
        {error}
      </p>
    ) : null}
    </div>
  );
}
