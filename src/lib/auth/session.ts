import type { AppRole } from "@/lib/schemas/auth";

/** Client-safe RBAC helpers (no NextAuth / server imports). */
export {
  canAccessAdminPanel,
  canAccessCeoPanel,
  isAdminRole,
  isStrictAdminRole,
} from "./rbac";

export interface AppSessionUser {
  id: string;
  userId?: string;
  name?: string | null;
  email?: string | null;
  role?: AppRole;
}
