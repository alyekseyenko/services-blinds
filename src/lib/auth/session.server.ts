import "server-only";

import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import type { AppRole } from "@/lib/schemas/auth";

export type AppSessionUser = {
  id: string;
  userId?: string;
  name?: string | null;
  email?: string | null;
  role: AppRole;
  twentyRoleLabel?: string;
};

export type AppSessionContext = {
  session: Awaited<ReturnType<typeof getServerSession>>;
  user: AppSessionUser;
};

export const getAppSession = cache(async (): Promise<AppSessionContext | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user;
  const resolvedId = user.id || user.userId;
  if (!resolvedId || !user.role) return null;

  return {
    session,
    user: {
      id: resolvedId,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      twentyRoleLabel: user.twentyRoleLabel,
    },
  };
});
