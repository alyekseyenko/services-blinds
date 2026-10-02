"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Play,
  RefreshCw,
  RotateCcw,
  Terminal,
  XCircle,
} from "lucide-react";
import type {
  E2ECheckResult,
  E2ESuiteReport,
  ObservabilityStatusPayload,
} from "@/lib/observability/e2eTypes";
import type { LuxuryWorkflowReport } from "@/lib/observability/luxury/luxuryTypes";
import { formatSyncAgeLabel } from "@/lib/formatSyncAge";
import {
  labelCheckStatus,
  labelHealthStatus,
} from "@/lib/ui/ptPtDisplay";
import { INTEGRATION_SYSTEMS } from "@/lib/observability/integrationManifest";
import { E2E_COVERS_BY_CHECK_ID } from "@/lib/observability/e2eCoversByCheckId";

interface TelemetryPayload {
  timestamp: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  logs: Array<{ level: string; message: string; timestamp: string }>;
  subsystems: {
    fieldSync?: {
      technicianCount: number;
      totalPending: number;
      totalFailed: number;
      techniciansWithFailures: number;
      technicians: Array<{
        technicianId: string;
        technicianName: string;
        pendingCount: number;
        failedCount: number;
        isOnline: boolean;
        lastReportAt: string;
      }>;
    };
  };
}

function statusIcon(status: E2ECheckResult["status"]) {
  if (status === "PASS") return <CheckCircle className="h-4 w-4 text-primary" />;
  if (status === "WARN") return <AlertTriangle className="h-4 w-4 text-warning-solid" />;
  if (status === "FAIL") return <XCircle className="h-4 w-4 text-danger-solid" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function triggerLabel(trigger: E2ESuiteReport["trigger"]): string {
  if (trigger === "deploy") return "pós-deploy";
  if (trigger === "scheduled") return "automática";
  return "manual";
}

export default function ObservabilityConsole() {
  const [statusPayload, setStatusPayload] = useState<ObservabilityStatusPayload | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [running, setRunning] = useState(false);
  const [runningLuxury, setRunningLuxury] = useState(false);
  const [luxuryJobId, setLuxuryJobId] = useState<string | null>(null);
  const [luxuryReport, setLuxuryReport] = useState<LuxuryWorkflowReport | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const lastRun = statusPayload?.lastRun ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, telemRes] = await Promise.all([
        fetch("/api/observability/status", { credentials: "include" }),
        fetch("/api/observability", { credentials: "include" }),
      ]);
      if (statusRes.ok) {
        setStatusPayload((await statusRes.json()) as ObservabilityStatusPayload);
      }
      if (telemRes.ok) {
        setTelemetry((await telemRes.json()) as TelemetryPayload);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const executeAction = async (
    action: string,
    extra: Record<string, unknown> = {}
  ) => {
    const res = await fetch("/api/observability", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Ação falhou.");
    }
    return data;
  };

  const runSuite = async (depth: "safe" | "full") => {
    setRunning(true);
    setMessage(null);
    try {
      const data = await executeAction("RUN_E2E_SUITE", { depth });
      const report = data.report as E2ESuiteReport;
      setStatusPayload((prev) => ({
        lastRun: {
          id: report.id,
          timestamp: report.timestamp,
          depth: report.depth,
          trigger: report.trigger,
          deploymentId: report.deploymentId,
          overallStatus: report.overallStatus,
          score: report.score,
          regressions: report.regressions,
          checks: report.checks,
          logs: report.logs,
        },
        history: prev?.history ?? [],
      }));
      setMessage({
        type: report.overallStatus === "CRITICAL" ? "error" : "ok",
        text: `Suite concluída — ${report.score.passed} OK, ${report.score.failed} falha(s).`,
      });
      await refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao correr a suite.",
      });
    } finally {
      setRunning(false);
    }
  };

  const pollLuxury = useCallback(async (jobId: string) => {
    const res = await fetch("/api/qa", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "LUXURY_WORKFLOW_E2E",
        action: "status",
        jobId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Estado Luxury indisponível.");
    if (data.report) setLuxuryReport(data.report as LuxuryWorkflowReport);
    if (data.job?.status === "completed" || data.job?.status === "failed") {
      setRunningLuxury(false);
      return false;
    }
    return true;
  }, []);

  const startLuxury = async () => {
    setRunningLuxury(true);
    setLuxuryReport(null);
    setMessage(null);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "LUXURY_WORKFLOW_E2E", action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível iniciar o Luxury.");
      setLuxuryJobId(data.jobId);
    } catch (err) {
      setRunningLuxury(false);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro no Luxury E2E.",
      });
    }
  };

  useEffect(() => {
    if (!luxuryJobId || !runningLuxury) return;
    const tick = async () => {
      try {
        const cont = await pollLuxury(luxuryJobId);
        if (!cont) setLuxuryJobId(null);
      } catch {
        setRunningLuxury(false);
      }
    };
    const interval = window.setInterval(() => void tick(), 4000);
    void tick();
    return () => window.clearInterval(interval);
  }, [luxuryJobId, runningLuxury, pollLuxury]);

  const coversByCheckId = useMemo(
    () => new Map(Object.entries(E2E_COVERS_BY_CHECK_ID)),
    []
  );

  const checksByCategory = useMemo(() => {
    const checks = lastRun?.checks ?? [];
    const map = new Map<string, E2ECheckResult[]>();
    for (const check of checks) {
      const list = map.get(check.category) ?? [];
      list.push(check);
      map.set(check.category, list);
    }
    return map;
  }, [lastRun]);

  const downloadJson = () => {
    const blob = new Blob(
      [JSON.stringify({ lastRun, telemetry, luxuryReport }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `observabilidade-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ageLabel = lastRun
    ? formatSyncAgeLabel(new Date(lastRun.timestamp).getTime())
    : "—";

  return (
    <div className="min-h-screen bg-ink text-ink-foreground">
      <header className="border-b border-border-strong bg-ink/90 px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Painel
            </Link>
            <h1 className="ds-title text-lg tracking-tight text-ink-foreground">
              Observabilidade
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={running}
              onClick={() => void runSuite("safe")}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-wide text-primary-foreground disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {running ? "A correr…" : "Correr agora (seguro)"}
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => void runSuite("full")}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-primary/40 px-4 text-xs font-bold text-primary-ink disabled:opacity-50"
            >
              Completo (n8n real)
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border-strong px-3 text-xs font-semibold text-muted-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>
        {message && (
          <p
            className={`mx-auto mt-3 max-w-6xl text-xs font-semibold ${
              message.type === "error" ? "text-danger-solid" : "text-primary-ink"
            }`}
          >
            {message.text}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="rounded-2xl border border-border-strong bg-ink/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Estado global
              </p>
              <p className="text-2xl font-black text-ink-foreground">
                {lastRun ? labelHealthStatus(lastRun.overallStatus) : "Sem execução"}
              </p>
              <p className="text-xs text-muted-foreground">
                Última execução {ageLabel} ({lastRun ? triggerLabel(lastRun.trigger) : "—"})
                {lastRun?.deploymentId ? ` · build ${lastRun.deploymentId.slice(0, 8)}` : ""}
              </p>
            </div>
            {lastRun && (
              <div className="text-right text-xs text-muted-foreground">
                <p>{lastRun.score.passed} OK · {lastRun.score.warned} aviso(s) · {lastRun.score.failed} falha(s)</p>
                {lastRun.regressions.length > 0 && (
                  <p className="font-semibold text-warning-solid">
                    Regressões: {lastRun.regressions.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            Sistemas
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {INTEGRATION_SYSTEMS.map((system) => {
              const tag = `system:${system.id}`;
              const check = lastRun?.checks.find((c) =>
                coversByCheckId.get(c.id)?.includes(tag)
              );
              return (
                <div
                  key={system.id}
                  className="rounded-xl border border-border-strong bg-ink/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink-foreground">{system.label}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{system.category}</p>
                    </div>
                    {check ? statusIcon(check.status) : <Activity className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  {check && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {labelCheckStatus(check.status)} — {check.message}
                    </p>
                  )}
                  {!check && (
                    <p className="mt-2 text-xs text-muted-foreground">Aguarda primeira execução automática.</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border-strong bg-ink/40 p-4">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-muted-foreground">
            Verificações por categoria
          </h2>
          <div className="space-y-4">
            {[...checksByCategory.entries()].map(([category, checks]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-bold text-primary-ink">{category}</p>
                <ul className="space-y-2">
                  {checks.map((check) => (
                    <li
                      key={check.id}
                      className="flex items-start gap-2 rounded-lg border border-border-strong/80 bg-ink/40 px-3 py-2 text-xs"
                    >
                      {statusIcon(check.status)}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-foreground">{check.name}</p>
                        <p className="text-muted-foreground">{check.message}</p>
                        {check.remediation && check.status !== "PASS" && (
                          <p className="mt-1 text-warning-solid/90">{check.remediation}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-muted-foreground">{check.latencyMs}ms</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!lastRun && (
              <p className="text-xs text-muted-foreground">Nenhuma verificação registada ainda.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void executeAction("RESET_CIRCUIT_BREAKER").then((d) =>
                  setMessage({ type: "ok", text: d.message })
                )
              }
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset circuit breaker
            </button>
            <button
              type="button"
              onClick={() =>
                void executeAction("REPROCESS_OUTBOX").then((d) =>
                  setMessage({ type: "ok", text: d.message })
                )
              }
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold"
            >
              Reprocessar outbox
            </button>
            <button
              type="button"
              onClick={() =>
                void executeAction("REQUEUE_FAILED").then((d) =>
                  setMessage({ type: "ok", text: d.message })
                )
              }
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold"
            >
              Requeue falhados
            </button>
            <button
              type="button"
              onClick={() =>
                void executeAction("PRUNE_STALE_OUTBOX").then((d) =>
                  setMessage({ type: "ok", text: d.message })
                )
              }
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold"
            >
              Limpar stale localhost
            </button>
          </div>
        </section>

        {telemetry?.subsystems.fieldSync && (
          <section className="rounded-2xl border border-border-strong bg-ink/40 p-4">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-muted-foreground">
              Sincronização dos técnicos
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {telemetry.subsystems.fieldSync.technicianCount} técnico(s) ·{" "}
              {telemetry.subsystems.fieldSync.totalPending} pendente(s) ·{" "}
              {telemetry.subsystems.fieldSync.totalFailed} falha(s)
            </p>
            <ul className="space-y-2">
              {telemetry.subsystems.fieldSync.technicians.map((t) => (
                <li
                  key={t.technicianId}
                  className="flex justify-between rounded-lg border border-border-strong px-3 py-2 text-xs"
                >
                  <span className="font-semibold">{t.technicianName}</span>
                  <span className="text-muted-foreground">
                    {t.pendingCount} pend. · {t.failedCount} falh. ·{" "}
                    {t.isOnline ? "online" : "offline"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-border-strong bg-ink/40 p-4">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-muted-foreground">
            Histórico
          </h2>
          <ul className="space-y-2">
            {(statusPayload?.history ?? []).map((entry) => (
              <li
                key={entry.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                  entry.regressions.length > 0
                    ? "border-warning-solid/40 bg-warning-solid/5"
                    : "border-border-strong"
                }`}
              >
                <span>{new Date(entry.timestamp).toLocaleString("pt-PT")}</span>
                <span className="text-muted-foreground">{triggerLabel(entry.trigger)}</span>
                <span className="font-semibold">{labelHealthStatus(entry.overallStatus)}</span>
                <span className="text-muted-foreground">
                  {entry.score.failed} falha(s)
                  {entry.regressions.length > 0
                    ? ` · regressões: ${entry.regressions.length}`
                    : ""}
                </span>
              </li>
            ))}
            {!statusPayload?.history?.length && (
              <p className="text-xs text-muted-foreground">Sem histórico ainda.</p>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-border-strong bg-ink/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary-ink" />
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              Logs do servidor
            </h2>
          </div>
          <pre className="max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
            {(telemetry?.logs ?? []).length
              ? telemetry!.logs
                  .map((l) => `[${l.timestamp}] ${l.level}: ${l.message}`)
                  .join("\n")
              : "Sem logs em memória."}
          </pre>
          <button
            type="button"
            onClick={() =>
              void executeAction("CLEAR_LOGS").then(() => void refresh())
            }
            className="mt-2 text-xs font-semibold text-muted-foreground hover:text-muted-foreground"
          >
            Limpar logs em memória
          </button>
        </section>

        <section className="rounded-2xl border border-border-strong bg-ink/40">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setAdvancedOpen((o) => !o)}
          >
            <span className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              Avançado — Luxury E2E
            </span>
            {advancedOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {advancedOpen && (
            <div className="space-y-3 border-t border-border-strong px-4 py-4">
              <p className="text-xs text-muted-foreground">
                Fluxo completo no CRM com limpeza automática no fim. Requer{" "}
                <code className="text-primary-ink">LUXURY_E2E_ENABLED=true</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={runningLuxury}
                  onClick={() => void startLuxury()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-secondary px-4 text-xs font-bold disabled:opacity-50"
                >
                  {runningLuxury ? "Luxury em curso…" : "Iniciar Luxury E2E"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void executeAction("CLEANUP_LUXURY_E2E").then((d) =>
                      setMessage({ type: "ok", text: d.message })
                    )
                  }
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold"
                >
                  Limpar dados E2E antigos
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar JSON
                </button>
              </div>
              {luxuryReport && (
                <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] text-muted-foreground">
                  {JSON.stringify(luxuryReport.score, null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
