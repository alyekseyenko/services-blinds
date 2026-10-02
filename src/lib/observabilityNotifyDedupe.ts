const LEDGER_PREFIX = "fieldops_observability_notify_";

export function shouldNotifyObservabilityReport(scope: string, reportId: string): boolean {
  if (typeof window === "undefined" || !scope || !reportId) return false;

  const key = `${LEDGER_PREFIX}${scope}`;
  try {
    const raw = localStorage.getItem(key);
    const lastId = raw ? JSON.parse(raw) : null;
    if (lastId === reportId) return false;
    localStorage.setItem(key, JSON.stringify(reportId));
    return true;
  } catch {
    return true;
  }
}
