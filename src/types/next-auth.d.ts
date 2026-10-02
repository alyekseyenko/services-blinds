import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/schemas/auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      userId?: string;
      role: AppRole;
      twentyRoleLabel?: string;
    };
  }

  interface User {
    id: string;
    userId?: string;
    role: AppRole;
    twentyRoleLabel?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    userId?: string;
    role?: AppRole;
    twentyRoleLabel?: string;
    roleValidatedAt?: number;
  }
}
