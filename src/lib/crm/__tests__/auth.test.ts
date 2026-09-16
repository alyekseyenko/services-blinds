import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUserCredentials } from '../auth';
import { TwentyAuthError } from '../twentyAuth';

vi.mock('../twentyAuth', () => ({
  authenticateWithTwenty: vi.fn(),
  TwentyAuthError: class TwentyAuthError extends Error {
    constructor(
      message: string,
      public readonly code: 'INVALID_CREDENTIALS' | 'NO_APP_ROLE' | 'CRM_ERROR' = 'CRM_ERROR'
    ) {
      super(message);
      this.name = 'TwentyAuthError';
    }
  },
}));

import { authenticateWithTwenty } from '../twentyAuth';

describe('validateUserCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve utilizador autenticado via Twenty', async () => {
    vi.mocked(authenticateWithTwenty).mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      name: 'Ana Ferreira',
      email: 'ana@habitarmos.com',
      role: 'admin',
      twentyRoleLabel: 'Member',
    });

    const user = await validateUserCredentials('ana@habitarmos.com', 'secret');
    expect(user?.name).toBe('Ana Ferreira');
    expect(user?.role).toBe('admin');
  });

  it('devolve null em credenciais inválidas', async () => {
    vi.mocked(authenticateWithTwenty).mockRejectedValue(
      new TwentyAuthError('Credenciais inválidas', 'INVALID_CREDENTIALS')
    );

    const user = await validateUserCredentials('ana@habitarmos.com', 'wrong');
    expect(user).toBeNull();
  });

  it('devolve null quando utilizador não tem role na app', async () => {
    vi.mocked(authenticateWithTwenty).mockRejectedValue(
      new TwentyAuthError('Sem permissão', 'NO_APP_ROLE')
    );

    const user = await validateUserCredentials('unknown@habitarmos.com', 'secret');
    expect(user).toBeNull();
  });
});
