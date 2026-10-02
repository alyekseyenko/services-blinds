"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { ArrowRight, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { APP_ROLE_HOME, type AppRole } from "@/lib/crm/contract";
import {
  probeAuthSession,
  waitForAuthSessionAfterLogin,
} from "@/lib/auth/confirmSession";
import { useToast } from "@/components/ui/ToastContext";
import { APP_NAME, APP_LOGO_PATH, LOGIN_EMAIL_PLACEHOLDER } from "@/lib/branding";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Marquee } from "@/components/ui/Marquee";
import { DisplayHeading } from "@/components/ui/DisplayHeading";

export default function Login() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const toast = useToast();

  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as { role?: AppRole } | undefined)?.role;
    if (role && APP_ROLE_HOME[role]) {
      router.replace(APP_ROLE_HOME[role]);
    }
  }, [session, status, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const redirectAfterLogin = (role?: string) => {
    const appRole = role as AppRole | undefined;
    const destination =
      appRole && APP_ROLE_HOME[appRole] ? APP_ROLE_HOME[appRole] : "/";
    toast.success("Sessão iniciada", "A carregar o seu espaço de trabalho...");
    window.location.replace(destination);
  };

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
        toast.error("Acesso recusado", message);
        return;
      }

      const probe = await waitForAuthSessionAfterLogin();
      if (probe.hasUser) {
        redirectAfterLogin(probe.role);
        return;
      }

      if (result?.ok) {
        window.location.replace("/");
        return;
      }

      const message = "Credenciais incorretas ou conta sem permissão na app.";
      setLoginError(message);
      toast.error("Acesso recusado", message);
    } catch (error) {
      console.error("Login error:", error);
      const recovery = await probeAuthSession();
      if (recovery.hasUser) {
        redirectAfterLogin(recovery.role);
        return;
      }
      const message = recovery.transientFailure
        ? "Não foi possível comunicar com o servidor. Tente novamente."
        : "Credenciais incorretas ou conta sem permissão na app.";
      setLoginError(message);
      toast.error(
        recovery.transientFailure ? "Erro de ligação" : "Acesso recusado",
        message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 font-sans text-foreground brutal-grid-bg bg-background"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden>
        <Marquee segments={["Medir", "Instalar", "Sincronizar"]} />
      </div>

      <div
        className="absolute right-4 z-20"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <ThemeToggle />
      </div>

      <div className="relative z-10 mb-16 w-full max-w-[22rem] sm:max-w-md">
        <div className="mb-6 text-center">
          <DisplayHeading
            as="h1"
            seal="arrow"
            lines={["Iniciar", "Sessão"]}
            className="text-center text-3xl sm:text-4xl [&>span]:justify-center"
          />
          <p className="ds-title mt-3 text-sm tracking-[0.15em] text-muted-foreground">{APP_NAME}</p>
        </div>
        <div className="rounded-2xl border-2 border-border-strong bg-card p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-xl border-2 border-border-strong bg-ink">
              <Image
                src={APP_LOGO_PATH}
                alt=""
                width={72}
                height={72}
                className="h-14 w-14 object-contain"
                priority
              />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Iniciar sessão</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block px-1 text-xs font-black uppercase tracking-widest text-muted-foreground"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                spellCheck={false}
                autoCapitalize="none"
                autoFocus
                placeholder={LOGIN_EMAIL_PLACEHOLDER}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-border-strong bg-input px-4 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
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
                className="h-12 w-full rounded-xl border-2 border-border-strong bg-input px-4 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>

            {loginError && (
              <div
                role="alert"
                data-testid="login-error"
                className="rounded-xl border-2 border-danger-solid bg-danger-surface px-4 py-3 text-sm font-semibold text-danger-fg dark:bg-ink/40 dark:text-danger-fg"
              >
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary text-sm font-black uppercase tracking-wider text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
