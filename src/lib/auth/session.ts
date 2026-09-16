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

export function isAdminRole(role: AppRole): boolean {
  return role === 'admin' || role === 'ceo';
}

/** Role Twenty "Admin" — acesso a observabilidade/SRE e APIs operacionais sensíveis. */
export function isStrictAdminRole(role: AppRole): boolean {
  return role === 'admin';
}

/** Painel executivo CEO — Admin e CEO do Twenty. */
export function canAccessCeoPanel(role: AppRole): boolean {
  return isAdminRole(role);
}
