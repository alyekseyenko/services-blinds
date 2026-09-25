import type { AppRole } from "@/lib/schemas/auth";

/** Painel operacional /admin e APIs de gestão (Admin, Member, CEO). */
export function canAccessAdminPanel(role: AppRole): boolean {
  return role === "admin" || role === "member" || role === "ceo";
}

export function isAdminRole(role: AppRole): boolean {
  return canAccessAdminPanel(role);
}

/** Role Twenty "Admin" — observabilidade/SRE e APIs operacionais sensíveis. */
export function isStrictAdminRole(role: AppRole): boolean {
  return role === "admin";
}

/** Painel executivo CEO — Twenty Admin ou role CEO dedicada (não Member). */
export function canAccessCeoPanel(role: AppRole): boolean {
  return role === "admin" || role === "ceo";
}
