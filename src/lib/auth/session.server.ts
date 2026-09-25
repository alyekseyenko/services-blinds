import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import type { AppSessionUser } from "@/lib/auth/session";

export async function getAppSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user as AppSessionUser;
  const resolvedId = user.id || user.userId;
  if (!resolvedId || !user.role) return null;

  return {
    session,
    user: { ...user, id: resolvedId },
  };
}
