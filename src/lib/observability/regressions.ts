import type { E2ECheckResult } from "./e2eTypes";

/** Verificações que passaram na execução anterior e falham agora. */
export function computeRegressions(
  previous: E2ECheckResult[] | undefined,
  current: E2ECheckResult[]
): string[] {
  if (!previous?.length) return [];

  const prevPass = new Map(
    previous
      .filter((c) => c.status === "PASS")
      .map((c) => [c.id, c] as const)
  );

  const regressions: string[] = [];
  for (const check of current) {
    if (check.status === "FAIL" && prevPass.has(check.id)) {
      regressions.push(check.id);
    }
  }
  return regressions;
}
