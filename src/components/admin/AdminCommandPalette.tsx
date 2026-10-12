"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  Map as MapIcon,
  Calendar,
  History,
  User,
  LayoutDashboard,
  ClipboardPlus,
  UserPlus,
  MapPin,
} from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/cn";
import { searchOpportunities } from "@/lib/admin/opportunitySearch";
import type { Opportunity } from "@/types/admin";

interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: "home" | "map" | "calendar" | "history") => void;
  onSearch: (query: string) => void;
  onSelectOpportunity: (opp: Opportunity) => void;
  opportunities: Opportunity[];
  technicians: string[];
  onSelectTechnician: (name: string) => void;
  onOpenCreateService?: () => void;
  onOpenCreateClient?: () => void;
}

const SERVICE_RESULT_LIMIT = 16;

const PALETTE_ROW_CLASS =
  "flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-muted active:scale-[0.99]";

const PALETTE_ICON_BOX =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-muted";

const PALETTE_GLYPH = "h-5 w-5 shrink-0 text-primary-ink";

function PaletteIcon({ icon: Icon, tone = "default" }: { icon: LucideIcon; tone?: "default" | "muted" }) {
  return (
    <span className={PALETTE_ICON_BOX}>
      <Icon
        className={cn(PALETTE_GLYPH, tone === "muted" && "text-muted-foreground")}
        strokeWidth={2}
        aria-hidden
      />
    </span>
  );
}

function PaletteRow({
  icon,
  label,
  detail,
  onClick,
  dataTour,
  iconTone = "default",
}: {
  icon: LucideIcon;
  label: string;
  detail?: string;
  onClick: () => void;
  dataTour?: string;
  iconTone?: "default" | "muted";
}) {
  return (
    <button type="button" data-tour={dataTour} onClick={onClick} className={PALETTE_ROW_CLASS}>
      <PaletteIcon icon={icon} tone={iconTone} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">{label}</span>
        {detail ? (
          <span className="block truncate text-xs font-medium text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </button>
  );
}

export default function AdminCommandPalette({
  open,
  onClose,
  onNavigate,
  onSearch,
  onSelectOpportunity,
  opportunities,
  technicians,
  onSelectTechnician,
  onOpenCreateService,
  onOpenCreateClient,
}: AdminCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const trimmed = query.trim();
  const showServiceResults = trimmed.length >= 2;

  const serviceResults = useMemo(
    () =>
      showServiceResults ? searchOpportunities(opportunities, trimmed, SERVICE_RESULT_LIMIT) : [],
    [showServiceResults, opportunities, trimmed]
  );

  const filteredTechs = useMemo(() => {
    if (!trimmed) return technicians.slice(0, 12);
    return technicians.filter((t) => t.toLowerCase().includes(trimmed.toLowerCase()));
  }, [technicians, trimmed]);

  const showNav = !showServiceResults;

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[199] bg-scrim"
        aria-label="Fechar pesquisa"
        onClick={onClose}
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className={cn(
          "fixed inset-x-0 top-0 z-[200] w-full border-b-2 border-border-strong bg-card shadow-lg",
          "pt-[max(0.5rem,env(safe-area-inset-top))]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full px-4 pb-4 pt-2 md:px-6 md:pb-5 md:pt-3 lg:px-8">
          <div className="flex items-center gap-3 border-b-2 border-border pb-3">
            <PaletteIcon icon={Search} tone="muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmed) {
                  e.preventDefault();
                  if (serviceResults.length === 1) {
                    onSelectOpportunity(serviceResults[0]);
                    onClose();
                    return;
                  }
                  onSearch(trimmed);
                  onClose();
                }
              }}
              placeholder="Cliente, morada, serviço ou técnico…"
              className="h-12 min-h-12 flex-1 bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
              aria-label="Pesquisar serviços"
            />
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <kbd className="rounded-lg border-2 border-border bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Ctrl K
              </kbd>
              <kbd className="rounded-lg border-2 border-border bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Esc
              </kbd>
            </div>
          </div>

          <div
            className={cn(
              "mt-3 overflow-y-auto overscroll-contain custom-scrollbar",
              "max-h-[min(58vh,28rem)] md:max-h-[min(65vh,36rem)]"
            )}
          >
            {showServiceResults && (
              <section>
                <p className="ds-kicker px-1 py-2">
                  Serviços
                  {serviceResults.length > 0 ? ` · ${serviceResults.length}` : ""}
                </p>
                {serviceResults.length === 0 ? (
                  <p className="px-1 py-4 text-sm font-semibold text-muted-foreground">
                    Nenhum serviço encontrado. Prima Enter para filtrar no mapa.
                  </p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {serviceResults.map((opp) => {
                      const meta = [opp.title, opp.addressCity, opp.nsi ? `NSI ${opp.nsi}` : null]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li key={opp.twentyId || opp.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectOpportunity(opp);
                              onClose();
                            }}
                            className={PALETTE_ROW_CLASS}
                          >
                            <PaletteIcon icon={MapPin} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-foreground">
                                {opp.client || "Cliente"}
                              </span>
                              {meta ? (
                                <span className="block truncate text-xs font-medium text-muted-foreground">
                                  {meta}
                                </span>
                              ) : null}
                              {opp.address ? (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {opp.address}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {showNav && (
              <div className="grid gap-4 lg:grid-cols-3">
                {(onOpenCreateClient || onOpenCreateService) && (
                  <section>
                    <p className="ds-kicker px-1 py-2">Operações</p>
                    <ul className="space-y-2">
                      {onOpenCreateClient ? (
                        <li>
                          <PaletteRow
                            icon={UserPlus}
                            label="Novo cliente"
                            detail="Grava o contacto no Twenty CRM"
                            dataTour="admin-palette-novo-cliente"
                            onClick={() => {
                              onOpenCreateClient();
                              onClose();
                            }}
                          />
                        </li>
                      ) : null}
                      {onOpenCreateService ? (
                        <li>
                          <PaletteRow
                            icon={ClipboardPlus}
                            label="Novo serviço técnico"
                            detail="Medição, instalação ou reparação"
                            dataTour="admin-palette-novo-servico"
                            onClick={() => {
                              onOpenCreateService();
                              onClose();
                            }}
                          />
                        </li>
                      ) : null}
                    </ul>
                  </section>
                )}

                <section>
                  <p className="ds-kicker px-1 py-2">Navegação</p>
                  <ul className="space-y-2">
                    {[
                      { id: "home" as const, label: "Início", icon: LayoutDashboard },
                      { id: "map" as const, label: "Mapa", icon: MapIcon },
                      { id: "calendar" as const, label: "Agenda", icon: Calendar },
                      { id: "history" as const, label: "Histórico", icon: History },
                    ].map((item) => (
                      <li key={item.id}>
                        <PaletteRow
                          icon={item.icon}
                          label={item.label}
                          onClick={() => {
                            onNavigate(item.id);
                            onClose();
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </section>

                {filteredTechs.length > 0 && (
                  <section>
                    <p className="ds-kicker px-1 py-2">Técnicos</p>
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      {filteredTechs.slice(0, 12).map((tech) => (
                        <li key={tech}>
                          <PaletteRow
                            icon={User}
                            iconTone="muted"
                            label={tech}
                            onClick={() => {
                              onSelectTechnician(tech);
                              onClose();
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {trimmed.length > 0 && trimmed.length < 2 && (
              <p className="px-1 py-3 text-xs font-semibold text-muted-foreground">
                Escreva pelo menos 2 caracteres para pesquisar serviços.
              </p>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
