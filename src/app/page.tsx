"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Loader2 } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import { APP_ROLE_HOME, type AppRole } from "@/lib/crm/contract";
import { useToast } from "@/components/ui/ToastContext";

export default function Login() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        toast.error(
          "Acesso Recusado",
          "Credenciais incorretas ou conta sem permissão na app."
        );
        return;
      }

      const session = await getSession();
      const role = (session?.user as { role?: AppRole } | undefined)?.role;
      const destination = role ? APP_ROLE_HOME[role] : "/";

      toast.success("Login com Sucesso!", "A carregar o seu espaço de trabalho...");
      window.location.href = destination;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro de Ligação", "Não foi possível comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5fa] flex flex-col justify-center items-center px-4 sm:px-6 relative overflow-hidden font-sans smooth-transition">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#84cc16]/5 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/2 rounded-full blur-[140px]"></div>
      </div>

      <div className="w-full max-w-md glass-panel-light rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-10 shadow-[0_25px_60px_rgba(15,23,42,0.08)] border border-white relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-5 sm:mb-8">
          <div className="w-14 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-2.5 sm:mb-4 group cursor-pointer">
            <Image
              src="/favi_64.png"
              alt="Estores Rainha Logo"
              width={80}
              height={80}
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#090d16] tracking-tighter uppercase italic">
            Estores Rainha
          </h1>
          <div className="h-1 w-12 sm:h-1.5 sm:w-14 bg-[#84cc16] rounded-full mt-1.5 sm:mt-2 shadow-[0_0_15px_rgba(132,204,22,0.5)]"></div>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.25em] mt-3 sm:mt-4 text-center">
            Sistemas de Gestão & Medição Pro
          </p>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Acesso com conta Twenty CRM
          </h2>
          <p className="text-slate-500 text-xs mt-2">
            O seu perfil (Técnico, Admin, Armazém ou CEO) é atribuído automaticamente.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          <div className="space-y-1.5 sm:space-y-2">
            <label
              htmlFor="email"
              className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1"
            >
              Identificação (Email)
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              spellCheck="false"
              autoCapitalize="none"
              autoFocus
              placeholder="exemplo@estoresrainha.pt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 sm:h-14 bg-white border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 text-sm sm:text-base text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 font-bold hover:border-slate-300 pointer-events-auto shadow-sm"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label
              htmlFor="password"
              className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1"
            >
              Palavra-Passe Segura
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 sm:h-14 bg-white border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 text-sm sm:text-base text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 font-bold hover:border-slate-300 pointer-events-auto shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 shadow-xl group active:scale-[0.98] cursor-pointer bg-[#121622] text-white hover:bg-slate-800 shadow-slate-900/10"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            ) : (
              <>
                Entrar no Sistema
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-200/60 flex flex-col items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#84cc16] rounded-full animate-pulse shadow-[0_0_10px_rgba(132,204,22,0.8)]"></div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Servidor On
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                PWA Ativa
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-xs font-black tracking-widest uppercase text-center">
            Estores Rainha Systems • v3.1 Twenty Auth
          </p>
        </div>
      </div>
    </div>
  );
}
