"use client";

import { Phone } from "lucide-react";
import { toTelHref } from "@/lib/crm/phones";

interface ContactPhoneListProps {
  phones?: string[] | null;
  emptyLabel?: string;
  compact?: boolean;
  className?: string;
}

export default function ContactPhoneList({
  phones,
  emptyLabel = "Indisponível",
  compact = false,
  className = "",
}: ContactPhoneListProps) {
  const normalizedPhones = (phones ?? []).filter(Boolean);

  if (normalizedPhones.length === 0) {
    return <p className="text-foreground font-bold">{emptyLabel}</p>;
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {normalizedPhones.map((phone, index) => (
          <a
            key={`${phone}-${index}`}
            href={toTelHref(phone)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm transition-colors hover:border-primary"
          >
            <Phone className="h-4 w-4 text-primary-ink" />
            <span className="ds-num">{phone}</span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {normalizedPhones.map((phone, index) => (
        <div key={`${phone}-${index}`} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase leading-none text-muted-foreground mb-1">
              {index === 0 ? "Telefone principal" : `Telefone adicional ${index}`}
            </p>
            <p className="text-foreground font-bold ds-num">{phone}</p>
          </div>
          <a
            href={toTelHref(phone)}
            className="bg-card border border-border p-2 rounded-xl hover:bg-info-surface transition-colors shadow-sm"
            aria-label={`Ligar para ${phone}`}
          >
            <Phone className="w-4 h-4 text-info-solid" />
          </a>
        </div>
      ))}
    </div>
  );
}
