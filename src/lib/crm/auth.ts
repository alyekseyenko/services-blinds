import { authenticateWithTwenty, TwentyAuthError } from './twentyAuth';
import type { AuthenticatedAppUser } from '@/lib/schemas/auth';

export async function validateUserCredentials(
  email: string,
  password: string
): Promise<AuthenticatedAppUser | null> {
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
