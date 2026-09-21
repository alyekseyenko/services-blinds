import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { AppRole } from '@/lib/schemas/auth';

export interface AppSessionUser {
  id: string;
  userId?: string;
  name?: string | null;
  email?: string | null;
  role?: AppRole;
}

export async function getAppSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user as AppSessionUser;
  if (!user.id || !user.role) return null;

  return { session, user };
}

/** Painel operacional /admin e APIs de gestão (Admin, Member, CEO). */
export function canAccessAdminPanel(role: AppRole): boolean {
  return role === 'admin' || role === 'member' || role === 'ceo';
}

export function isAdminRole(role: AppRole): boolean {
  return canAccessAdminPanel(role);
}

/** Role Twenty "Admin" — observabilidade/SRE e APIs operacionais sensíveis. */
export function isStrictAdminRole(role: AppRole): boolean {
  return role === 'admin';
}

/** Painel executivo CEO — Twenty Admin ou role CEO dedicada (não Member). */
export function canAccessCeoPanel(role: AppRole): boolean {
  return role === 'admin' || role === 'ceo';
}
