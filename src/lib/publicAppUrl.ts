import "server-only";

/** Base URL for links sent to clients (evaluation, cancellation). */
export function getPublicAppBaseUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "";
  if (candidate) {
    return candidate.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL ou NEXTAUTH_URL é obrigatório em produção."
    );
  }
  return "http://localhost:3000";
}
