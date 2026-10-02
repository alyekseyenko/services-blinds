export const STALE_CLIENT_USER_MESSAGE =
  "Há uma versão nova da app. Recarregue a página (ou feche e volte a abrir) e tente novamente.";

export function isStaleServerActionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("server action") &&
    (m.includes("was not found") || m.includes("failed to find") || m.includes("failed-to-find"))
  );
}
