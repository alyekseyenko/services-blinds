import "server-only";

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function normalizedPublicAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (isLoopbackHost(parsed.hostname)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/** Evita redirects do NextAuth para localhost quando a app pública está noutro domínio. */
export function resolveAuthRedirectUrl(url: string, baseUrl: string): string {
  const publicOrigin = normalizedPublicAppUrl();

  let effectiveBase = baseUrl;
  try {
    const base = new URL(baseUrl);
    if (publicOrigin && isLoopbackHost(base.hostname)) {
      effectiveBase = publicOrigin;
    }
  } catch {
    effectiveBase = publicOrigin ?? baseUrl;
  }

  if (url.startsWith("/")) {
    return url;
  }

  try {
    const target = new URL(url);
    if (isLoopbackHost(target.hostname) && publicOrigin) {
      const path = `${target.pathname}${target.search}${target.hash}` || "/";
      return path.startsWith("/") ? path : `/${path}`;
    }

    const base = new URL(effectiveBase);
    if (target.origin === base.origin) {
      return url;
    }
  } catch {
    return "/";
  }

  return "/";
}
