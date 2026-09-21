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
  emptyLabel = "Not available",
  compact = false,
  className = "",
}: ContactPhoneListProps) {
  const normalizedPhones = (phones ?? []).filter(Boolean);

  if (normalizedPhones.length === 0) {
    return <p className="text-slate-800 font-bold">{emptyLabel}</p>;
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {normalizedPhones.map((phone, index) => (
          <a
            key={`${phone}-${index}`}
            href={toTelHref(phone)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition-colors hover:border-[#84cc16]"
          >
            <Phone className="h-4 w-4 text-[#84cc16]" />
            <span className="font-mono">{phone}</span>
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
            <p className="text-[10px] font-bold uppercase leading-none text-slate-400 mb-1">
              {index === 0 ? "Primary phone" : `Additional phone ${index}`}
            </p>
            <p className="text-slate-800 font-bold font-mono">{phone}</p>
          </div>
          <a
            href={toTelHref(phone)}
            className="bg-white border border-slate-200 p-2 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            aria-label={`Call ${phone}`}
          >
            <Phone className="w-4 h-4 text-blue-600" />
          </a>
        </div>
      ))}
    </div>
  );
}
