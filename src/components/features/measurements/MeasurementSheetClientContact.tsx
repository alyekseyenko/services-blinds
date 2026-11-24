import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { measurementClientContactFields } from "@/lib/measurements/clientContactDisplay";
import { buildNavigationUrls } from "@/lib/navigationUtils";
import { toTelHref } from "@/lib/crm/phones";
import { toWhatsAppHref } from "@/lib/phoneWhatsApp";

type Props = {
  sheet: Pick<MeasurementSheet, "clientName" | "address" | "clientNif" | "clientPhone" | "clientEmail">;
};

const contactActionClass =
  "inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary";

/** Cartão «Dados do cliente», separado do bloco serviço/ficha. */
export function MeasurementSheetClientContact({ sheet }: Props) {
  const contactFields = measurementClientContactFields(sheet);
  const address = sheet.address?.trim() ?? "";
  const mapsHref = address ? buildNavigationUrls(address).googleMaps : null;

  return (
    <section
      className="min-w-0 rounded-xl border-2 border-border bg-muted/40 p-4 lg:order-2"
      aria-labelledby="measurement-client-heading"
    >
      <h3
        id="measurement-client-heading"
        className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground"
      >
        Dados do cliente
      </h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <dt className="ds-kicker">Nome</dt>
          <dd className="text-sm font-bold">{sheet.clientName}</dd>
        </div>
        <div className="sm:col-span-3 border-t border-border pt-3">
          <dt className="ds-kicker">Morada</dt>
          {address && mapsHref ? (
            <dd>
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-start gap-2 text-sm font-bold text-info-fg underline-offset-2 hover:underline"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-info-solid" aria-hidden />
                <span className="leading-snug">{address}</span>
              </a>
            </dd>
          ) : (
            <dd className="text-sm font-bold leading-snug">{address || "—"}</dd>
          )}
        </div>
        {contactFields.length > 0 ? (
          <>
            {contactFields.map((field) => (
              <div
                key={field.label}
                className="min-w-0 border-t border-border pt-3 sm:border-t-0 sm:pt-0"
              >
                <dt className="ds-kicker">{field.label}</dt>
                {field.label === "Telefone" ? (
                  <dd className="flex flex-wrap items-center gap-2">
                    <a
                      href={toTelHref(field.value)}
                      className="ds-num text-sm font-bold text-foreground underline-offset-2 hover:underline"
                    >
                      {field.value}
                    </a>
                    <a
                      href={toTelHref(field.value)}
                      className={contactActionClass}
                      aria-label={`Ligar para ${field.value}`}
                    >
                      <Phone className="h-4 w-4 text-info-solid" aria-hidden />
                    </a>
                    <a
                      href={toWhatsAppHref(field.value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={contactActionClass}
                      aria-label={`WhatsApp para ${field.value}`}
                    >
                      <MessageCircle className="h-4 w-4 text-success-solid" aria-hidden />
                    </a>
                  </dd>
                ) : field.label === "E-mail" ? (
                  <dd>
                    <a
                      href={`mailto:${encodeURIComponent(field.value)}`}
                      className="ds-num break-all text-sm font-bold text-info-fg underline-offset-2 hover:underline"
                    >
                      {field.value}
                    </a>
                  </dd>
                ) : (
                  <dd className="ds-num break-all text-sm font-bold">{field.value}</dd>
                )}
              </div>
            ))}
          </>
        ) : null}
      </dl>
    </section>
  );
}