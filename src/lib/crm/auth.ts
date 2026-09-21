import { authenticateWithTwenty, TwentyAuthError } from './twentyAuth';
import type { AuthenticatedAppUser } from '@/lib/schemas/auth';

function isCiPlaceholderTwenty(): boolean {
  const key = process.env.TWENTY_API_KEY ?? '';
  return process.env.CI === 'true' && key.startsWith('ci-placeholder');
}

export async function validateUserCredentials(
  email: string,
  password: string
): Promise<AuthenticatedAppUser | null> {
  // CI smoke tests have no real Twenty instance — fail fast instead of timing out.
  if (isCiPlaceholderTwenty()) {
    return null;
  }

  try {
    return await authenticateWithTwenty(email, password);
  } catch (error) {
    if (error instanceof TwentyAuthError) {
      return null;
    }
    console.error('[Auth] Twenty login failed:', error);
    return null;
  }
}
