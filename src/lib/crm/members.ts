"use server";

import { fetchWorkspaceRoles, isTechnicianRoleLabel } from './twentyAuth';

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

  return technicians;
}
