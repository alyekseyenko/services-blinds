import { describe, it, expect } from 'vitest';
import {
  mapTwentyRoleLabelToAppRole,
  APP_ROLE_HOME,
} from '../contract';
import {
  resolveAppRoleFromRoles,
  isTechnicianRoleLabel,
} from '../twentyAuth';

describe('Twenty auth role mapping', () => {
  it('mapeia labels do Twenty para roles da app', () => {
    expect(mapTwentyRoleLabelToAppRole('Member')).toBe('admin');
    expect(mapTwentyRoleLabelToAppRole('Técnicos')).toBe('technician');
    expect(mapTwentyRoleLabelToAppRole('CEO')).toBe('ceo');
    expect(mapTwentyRoleLabelToAppRole('Armazem')).toBe('warehouse');
    expect(mapTwentyRoleLabelToAppRole('Admin')).toBe('admin');
    expect(mapTwentyRoleLabelToAppRole('Desconhecida')).toBeNull();
  });

  it('resolve a role pelo workspaceMemberId', () => {
    const roles = [
      {
        id: 'role-member',
        label: 'Member',
        workspaceMembers: [
          {
            id: 'member-1',
            userEmail: 'ana@example.com',
            name: { firstName: 'Ana', lastName: 'Ferreira' },
          },
        ],
      },
      {
        id: 'role-tech',
        label: 'Técnicos',
        workspaceMembers: [
          {
            id: 'tech-1',
            userEmail: 'technician@example.com',
            name: { firstName: 'Técnico', lastName: 'Um' },
          },
        ],
      },
    ];

    expect(resolveAppRoleFromRoles('member-1', roles)).toEqual({
      role: 'admin',
      twentyRoleLabel: 'Member',
    });
    expect(resolveAppRoleFromRoles('tech-1', roles)).toEqual({
      role: 'technician',
      twentyRoleLabel: 'Técnicos',
    });
    expect(resolveAppRoleFromRoles('missing', roles)).toBeNull();
  });

  it('identifica labels de técnico', () => {
    expect(isTechnicianRoleLabel('Técnicos')).toBe(true);
    expect(isTechnicianRoleLabel('Tecnico')).toBe(true);
    expect(isTechnicianRoleLabel('Member')).toBe(false);
  });

  it('define destinos por role', () => {
    expect(APP_ROLE_HOME.admin).toBe('/admin');
    expect(APP_ROLE_HOME.technician).toBe('/dashboard');
    expect(APP_ROLE_HOME.warehouse).toBe('/armazem');
    expect(APP_ROLE_HOME.ceo).toBe('/ceo');
  });
});
