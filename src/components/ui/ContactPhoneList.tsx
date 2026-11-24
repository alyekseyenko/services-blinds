"use client";

import { MessageCircle, Phone } from "lucide-react";
import { toTelHref } from "@/lib/crm/phones";
import { toWhatsAppHref } from "@/lib/phoneWhatsApp";

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

  const actionButtonClass =
    "flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-card transition-colors shadow-sm hover:border-primary";

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {normalizedPhones.map((phone, index) => (
          <div
            key={`${phone}-${index}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm"
          >
            <Phone className="h-4 w-4 text-primary-ink" />
            <span className="ds-num">{phone}</span>
            <a
              href={toTelHref(phone)}
              className={`${actionButtonClass} border-0 p-0 min-w-10 min-h-10`}
              aria-label={`Ligar para ${phone}`}
            >
              <Phone className="h-4 w-4 text-info-solid" />
            </a>
            <a
              href={toWhatsAppHref(phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${actionButtonClass} border-0 p-0 min-w-10 min-h-10`}
              aria-label={`WhatsApp para ${phone}`}
            >
              <MessageCircle className="h-4 w-4 text-success-solid" />
            </a>
          </div>
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
          <div className="flex shrink-0 gap-2">
            <a
              href={toTelHref(phone)}
              className={`${actionButtonClass} hover:bg-info-surface`}
              aria-label={`Ligar para ${phone}`}
            >
              <Phone className="w-4 h-4 text-info-solid" />
            </a>
            <a
              href={toWhatsAppHref(phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${actionButtonClass} hover:bg-success-surface`}
              aria-label={`WhatsApp para ${phone}`}
            >
              <MessageCircle className="w-4 h-4 text-success-solid" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}