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

/** Workspace member id used for CRM task assignee — not the Twenty user id when both exist. */
export function resolveWorkspaceMemberId(
  user: { id?: string; userId?: string } | null | undefined
): string {
  if (!user) return "";
  return user.id || user.userId || "";
}

export function technicianIdMatchesSession(
  requestedId: string | null | undefined,
  sessionUser: { id?: string; userId?: string }
): boolean {
  if (!requestedId) return true;
  const memberId = resolveWorkspaceMemberId(sessionUser);
  return requestedId === memberId || requestedId === sessionUser.userId;
}
