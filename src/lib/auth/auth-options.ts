import "server-only";

import CredentialsProvider from "next-auth/providers/credentials";
import { validateUserCredentials } from "@/lib/crm/auth";
import { resolveAppRoleFromWorkspaceMember } from "@/lib/crm/twentyAuth";
import {
  clearLoginAttempts,
  isLoginRateLimited,
  recordFailedLoginAttempt,
} from "@/lib/auth/loginRateLimit";
import { resolveAuthRedirectUrl } from "@/lib/auth/safeAuthRedirect";

const SESSION_MAX_AGE_SEC = 12 * 60 * 60;
const ROLE_REFRESH_MS = 30 * 60 * 1000;

export const authOptions = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "text" },
        password: { label: "Palavra-passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        if (isLoginRateLimited(credentials.email)) {
          return null;
        }

        const user = await validateUserCredentials(
          credentials.email,
          credentials.password
        );

        if (user) {
          clearLoginAttempts(credentials.email);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            userId: user.userId,
            twentyRoleLabel: user.twentyRoleLabel,
          };
        }
        recordFailedLoginAttempt(credentials.email);
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.userId = user.userId;
        token.twentyRoleLabel = user.twentyRoleLabel;
        token.roleValidatedAt = Date.now();
      }

      const memberId = token.id as string | undefined;
      const lastValidated = (token.roleValidatedAt as number) || 0;
      if (memberId && Date.now() - lastValidated > ROLE_REFRESH_MS) {
        try {
          const resolved = await resolveAppRoleFromWorkspaceMember(memberId);
          if (!resolved) {
            token.role = null;
          } else {
            token.role = resolved.role;
            token.twentyRoleLabel = resolved.twentyRoleLabel;
          }
          token.roleValidatedAt = Date.now();
        } catch {
          // Backoff: evita metadata fetch em cada pedido enquanto o Twenty está em baixo.
          token.roleValidatedAt = Date.now() - ROLE_REFRESH_MS + 120_000;
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.userId = token.userId;
        session.user.twentyRoleLabel = token.twentyRoleLabel;
      }
      return session;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      return resolveAuthRedirectUrl(url, baseUrl);
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: SESSION_MAX_AGE_SEC,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SEC,
  },
  events: {
    async signIn({
      user,
    }: {
      user: { role?: string; email?: string | null; name?: string | null };
    }) {
      if (user?.role === "technician" && user.email) {
        void import("@/lib/crm/notifications").then(({ syncTechnicianViaN8n }) => {
          void syncTechnicianViaN8n({
            email: user.email!,
            name: user.name,
          }).catch(console.error);
        });
      }
    },
  },
};
