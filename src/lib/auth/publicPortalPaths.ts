/** Paths where anonymous Server Actions are allowed (HMAC-validated portal forms). */
export const PUBLIC_SERVER_ACTION_PATH_PREFIXES = ["/avaliacao", "/cancelamento"] as const;

export function allowsAnonymousServerAction(pathname: string): boolean {
  return PUBLIC_SERVER_ACTION_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
