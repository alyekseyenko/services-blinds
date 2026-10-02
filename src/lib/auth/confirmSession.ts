/** Client-side session probe (avoids logout on transient /api/auth/session failures). */

export type SessionProbeResult = {
  ok: boolean;
  hasUser: boolean;
  role?: string;
  transientFailure: boolean;
};

export async function probeAuthSession(timeoutMs = 12_000): Promise<SessionProbeResult> {
  try {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const transient = res.status >= 500 || res.status === 408 || res.status === 429;
      return { ok: false, hasUser: false, transientFailure: transient };
    }
    const data = (await res.json()) as { user?: { role?: string } } | null;
    const role = data?.user?.role;
    return {
      ok: true,
      hasUser: Boolean(data?.user),
      role,
      transientFailure: false,
    };
  } catch {
    return { ok: false, hasUser: false, transientFailure: true };
  }
}

/** Após credentials signIn, o cookie pode demorar — evita falso "erro de ligação". */
export async function waitForAuthSessionAfterLogin(
  maxAttempts = 8,
  delayMs = 350
): Promise<SessionProbeResult> {
  let last: SessionProbeResult = {
    ok: false,
    hasUser: false,
    transientFailure: true,
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await probeAuthSession(12_000);
    if (last.hasUser && last.role) {
      return last;
    }
    if (last.ok && !last.hasUser && attempt >= 2) {
      return last;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return last;
}
