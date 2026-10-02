"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { APP_NAME, APP_SHORT_NAME, APP_LOGO_PATH } from "@/lib/branding";
import TourHelpButton from "@/components/onboarding/TourHelpButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export interface WarehouseHeaderProps {
  greeting: string;
  userName: string;
  onLogout: () => void;
}

export default function WarehouseHeader({ greeting, userName, onLogout }: WarehouseHeaderProps) {
  return (
    <header className="safe-top sticky top-0 z-50 border-b-2 border-border-strong bg-card transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-full items-center justify-between px-3 md:h-24 md:px-12">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 flex items-center justify-center group shrink-0">
            <Image
              src={APP_LOGO_PATH}
              alt="Logótipo da empresa"
              width={56}
              height={56}
              className="w-14 h-14 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="ds-title text-2xl tracking-tighter text-foreground">
                {APP_NAME}
              </h1>
              {APP_SHORT_NAME !== APP_NAME && (
                <span className="rounded-md border border-border-strong bg-ink px-2 py-0.5 text-xs font-black uppercase text-ink-foreground">
                  {APP_SHORT_NAME}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Gestão de Produção & Armazém
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-8">
          <TourHelpButton className="border-border bg-card" />
          <ThemeToggle />
          <div className="hidden md:block text-right">
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">{greeting},</p>
            <p className="text-base font-extrabold text-foreground">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border-2 border-border-strong bg-card p-3.5 transition-all hover:border-danger-solid hover:bg-danger-surface hover:text-danger-fg group active:scale-95"
            title="Terminar Sessão"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
