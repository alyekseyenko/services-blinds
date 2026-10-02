import { signOut } from "next-auth/react";

/**
 * Termina sessão e volta ao login no mesmo host do browser.
 * Evita redirect para NEXTAUTH_URL errado (ex. localhost:3005 em produção).
 */
export async function signOutToAppLogin(): Promise<void> {
  if (typeof window === "undefined") return;

  const home = `${window.location.origin}/`;
  try {
    await signOut({ redirect: false, callbackUrl: home });
  } catch {
    /* sessão pode já estar inválida — continuar para o login */
  }
  window.location.replace(home);
}
