import "server-only";

import { fetchWorkspaceRoles, isTechnicianRoleLabel } from './twentyAuth';
import {
  CRM_CACHE_KEYS,
  MEMBERS_TTL_SEC,
  cacheGet,
  cacheSet,
} from '@/lib/crmCache';

export interface WorkspaceMemberOption {
  id: string;
  name: string;
  email: string;
  isWorkspaceMember: boolean;
}

function buildMemberName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null
): string {
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return fullName || email || 'Membro';
}

/**
 * Lista técnicos disponíveis para agendamento (role "Técnicos" no Twenty CRM).
 */
export async function fetchWorkspaceMembers(): Promise<WorkspaceMemberOption[]> {
  const cached = await cacheGet<WorkspaceMemberOption[]>(CRM_CACHE_KEYS.workspaceMembers);
  if (cached) return cached;

  const roles = await fetchWorkspaceRoles();
  const technicianRoles = roles.filter((role) => isTechnicianRoleLabel(role.label));

  const technicians: WorkspaceMemberOption[] = [];
  for (const role of technicianRoles) {
    for (const member of role.workspaceMembers) {
      technicians.push({
        id: member.id,
        name: buildMemberName(
          member.name?.firstName,
          member.name?.lastName,
          member.userEmail
        ),
        email: member.userEmail || '',
        isWorkspaceMember: true,
      });
    }
  }

  await cacheSet(CRM_CACHE_KEYS.workspaceMembers, technicians, MEMBERS_TTL_SEC);
  return technicians;
}
