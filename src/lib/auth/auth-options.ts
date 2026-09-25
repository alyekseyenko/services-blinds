import "server-only";

import CredentialsProvider from "next-auth/providers/credentials";
import { validateUserCredentials } from "@/lib/crm/auth";

export const authOptions = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await validateUserCredentials(
          credentials.email,
          credentials.password
        );

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            userId: user.userId,
            twentyRoleLabel: user.twentyRoleLabel,
          };
        }
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
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt" as const,
  },
  events: {
    async signIn({
      user,
    }: {
      user: { role?: string; email?: string | null; name?: string | null };
    }) {
      if (user?.role === "technician" && user.email) {
        const { syncTechnicianViaN8n } = await import("@/lib/crm/notifications");
        syncTechnicianViaN8n({ email: user.email, name: user.name }).catch(console.error);
      }
    },
  },
};
