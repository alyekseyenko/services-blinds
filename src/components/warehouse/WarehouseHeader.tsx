"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { APP_NAME, APP_SHORT_NAME, APP_LOGO_PATH } from "@/lib/branding";

export interface WarehouseHeaderProps {
  greeting: string;
  userName: string;
  onLogout: () => void;
}

export default function WarehouseHeader({ greeting, userName, onLogout }: WarehouseHeaderProps) {
  return (
    <header className="glass-panel-light border-b border-slate-200 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-full mx-auto px-6 md:px-12 h-24 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 flex items-center justify-center group shrink-0">
            <Image
              src={APP_LOGO_PATH}
              alt="Company logo"
              width={56}
              height={56}
              className="w-14 h-14 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black uppercase tracking-tighter text-[#090d16]">
                {APP_NAME}
              </h1>
              {APP_SHORT_NAME !== APP_NAME && (
                <span className="bg-[#121622] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-slate-800">
                  {APP_SHORT_NAME}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Gestão de Produção & Armazém
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:block text-right">
            <p className="text-xs text-slate-500 font-black uppercase tracking-widest">{greeting},</p>
            <p className="text-base font-extrabold text-[#090d16]">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-red-50 hover:text-white transition-all group active:scale-95 shadow-sm"
            title="Terminar Sessão"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
