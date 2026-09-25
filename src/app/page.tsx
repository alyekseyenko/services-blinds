"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Loader2 } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import { APP_ROLE_HOME, type AppRole } from "@/lib/crm/contract";
import { useToast } from "@/components/ui/ToastContext";
import { APP_NAME, APP_LOGO_PATH, LOGIN_EMAIL_PLACEHOLDER } from "@/lib/branding";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Login() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        const message = "Credenciais incorretas ou conta sem permissão na app.";
        setLoginError(message);
        toast.error("Acesso Recusado", message);
        return;
      }

      const session = await getSession();
      const role = (session?.user as { role?: AppRole } | undefined)?.role;
      const destination = role ? APP_ROLE_HOME[role] : "/";

      toast.success("Login com Sucesso!", "A carregar o seu espaço de trabalho...");
      window.location.href = destination;
    } catch (error) {
      console.error("Login error:", error);
      const message = "Não foi possível comunicar com o servidor.";
      setLoginError(message);
      toast.error("Erro de Ligação", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-4 font-sans text-foreground dark:bg-[#141414]"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[55%] w-[70%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[45%] w-[60%] rounded-full bg-muted blur-[100px] dark:bg-neutral-800/30" />
      </div>

      <div className="absolute right-4 top-4 z-20" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex w-full max-w-[26rem] flex-col sm:max-w-md md:max-w-lg">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-xl sm:rounded-[2.5rem] sm:p-8 md:p-10 dark:glass-panel-dark dark:shadow-[0_25px_60px_rgba(0,0,0,0.55)]">
          <div className="mb-6 flex flex-col items-center sm:mb-8">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted ring-1 ring-border sm:h-[4.5rem] sm:w-[4.5rem] dark:bg-[#121620] dark:ring-slate-700/80">
              <Image
                src={APP_LOGO_PATH}
                alt="Logótipo"
                width={72}
                height={72}
                className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                priority
              />
            </div>
            <h1 className="text-center text-xl font-black uppercase italic tracking-tighter text-foreground sm:text-2xl">
              {APP_NAME}
            </h1>
            <div className="mt-2 h-1 w-12 rounded-full bg-primary shadow-[0_0_15px_rgba(132,204,22,0.45)]" />
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Operações em campo
            </p>
          </div>

          <div className="mb-5 text-center sm:mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Entrar com conta Twenty
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Perfil atribuído automaticamente (técnico, armazém, admin).
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block px-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                spellCheck="false"
                autoCapitalize="none"
                autoFocus
                placeholder={LOGIN_EMAIL_PLACEHOLDER}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-input px-4 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-slate-700/80 dark:bg-[#0b0f17] dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block px-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
              >
                Palavra-passe
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-input px-4 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-slate-700/80 dark:bg-[#0b0f17] dark:text-white"
              />
            </div>

            {loginError && (
              <div
                role="alert"
                data-testid="login-error"
                className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-300"
              >
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-black uppercase tracking-[0.15em] text-primary-foreground shadow-[0_10px_35px_rgba(132,204,22,0.25)] transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 border-t border-border pt-5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_#84cc16]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Online</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">PWA</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {APP_NAME} · CRM seguro
        </p>
      </div>
    </div>
  );
}
