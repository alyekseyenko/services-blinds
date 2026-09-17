"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Activity, 
  ShieldAlert, 
  Zap, 
  Terminal, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Server, 
  Cpu, 
  Database, 
  Radio, 
  Lock, 
  Key, 
  ArrowLeft,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Copy,
  Gauge,
  CheckCircle2,
  XOctagon,
  Download,
  X,
  FileCheck,
  Layers
} from "lucide-react";
import type { QADiagnosticReport } from "@/lib/qaDiagnostics";
import { APP_NAME } from "@/lib/branding";


interface TelemetryData {
  timestamp: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  subsystems: {
    crm: {
      status: string;
      latencyMs: number;
      error: string | null;
      circuitBreaker: {
        state: "CLOSED" | "OPEN" | "HALF_OPEN";
      };
    };
    outbox: {
      total: number;
      pending: number;
      processed: number;
      failed: number;
    };
    locationTracking: {
      activeCount: number;
      technicians: Array<{
        technicianId: string;
        technicianName: string;
        lat: number;
        lng: number;
        lastUpdate: string;
      }>;
    };
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
        lastSyncSuccess?: number | null;
        failedItems?: Array<{
          action: string;
          taskId: string;
          lastError?: string;
          retries?: number;
          timestamp: number;
        }>;
      }>;
    };
    aiEngine: {
      cacheEntriesCount: number;
      cacheStats: any;
      learningsCount: number;
      performanceInsights: any;
    };
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  context?: any;
}

export default function ObservabilityDashboard() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [sessionLocked, setSessionLocked] = useState(false);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAuthenticated =
    sessionStatus === "authenticated" && role === "admin" && !sessionLocked;

  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [logsFilter, setLogsFilter] = useState<"ALL" | "ERROR" | "WARN" | "INFO">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [mockLogs, setMockLogs] = useState<LogEntry[]>([]);

  // Estado do Diagnóstico QA 360
  const [isQaModalOpen, setIsQaModalOpen] = useState(false);
  const [qaReport, setQaReport] = useState<QADiagnosticReport | null>(null);
  const [isQaRunning, setIsQaRunning] = useState(false);

  // Executar Diagnóstico Holístico QA 360
  const triggerQA360Diagnostic = async () => {
    try {
      setIsQaRunning(true);
      setIsQaModalOpen(true);
      setActionMessage(null);

      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "BENCHMARK_360" })
      });

      const data = await res.json();
      if (res.ok && data.success && data.report) {
        setQaReport(data.report);
        fetchTelemetry(); // Atualizar contadores
      } else {
        setActionMessage({ type: "error", text: data.error || "Falha ao executar diagnóstico QA 360." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Erro na execução do QA 360: " + err.message });
    } finally {
      setIsQaRunning(false);
    }
  };

  // Gerar Lead de Exemplo no Twenty CRM
  const triggerCreateSampleLead = async () => {
    try {
      setActionLoading("CREATE_SAMPLE");
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "CREATE_SAMPLE_OPPORTUNITY" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ 
          type: "success", 
          text: `Lead Exemplar criado com sucesso no CRM! (NSI: ${data.nsi})` 
        });
        fetchTelemetry();
      } else {
        setActionMessage({ type: "error", text: data.error || "Falha ao criar lead exemplar." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Erro ao criar lead: " + err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Exportar Relatório em JSON
  const downloadReportJson = () => {
    if (!qaReport) return;
    const blob = new Blob([JSON.stringify(qaReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QA_360_REPORT_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // Carregar dados de telemetria
  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/observability");
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);

        // Obter logs reais do backend
        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          setMockLogs(data.logs);
        } else {
          // Logs de telemetria em tempo real
          const currentLogs: LogEntry[] = [
            {
              id: "log-1",
              timestamp: new Date().toISOString(),
              level: data.subsystems.crm.status === "HEALTHY" ? "INFO" : "ERROR",
              message: `CRM GraphQL Healthcheck: ${data.subsystems.crm.status} (${data.subsystems.crm.latencyMs}ms)`,
              context: data.subsystems.crm
            },
            {
              id: "log-2",
              timestamp: new Date().toISOString(),
              level: data.subsystems.crm.circuitBreaker.state === "CLOSED" ? "INFO" : "WARN",
              message: `Circuit Breaker State Machine: ${data.subsystems.crm.circuitBreaker.state}`,
              context: data.subsystems.crm.circuitBreaker
            },
            {
              id: "log-3",
              timestamp: new Date().toISOString(),
              level: data.subsystems.outbox.failed > 0 ? "ERROR" : "INFO",
              message: `Transactional Outbox Queue: ${data.subsystems.outbox.processed} processados, ${data.subsystems.outbox.pending} pendentes, ${data.subsystems.outbox.failed} falhados`,
              context: data.subsystems.outbox
            },
            {
              id: "log-4",
              timestamp: new Date().toISOString(),
              level: "INFO",
              message: `Semantic AI Cache: ${data.subsystems.aiEngine.cacheEntriesCount} consultas normalizadas em memória`,
              context: data.subsystems.aiEngine.cacheStats
            }
          ];
          setMockLogs(currentLogs);
        }
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Erro ao carregar telemetria: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (role === "admin") return;
    router.replace(role === "ceo" ? "/ceo" : "/");
  }, [sessionStatus, role, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const executeAction = async (action: string, endpoint = "/api/observability", method = "POST", payload: any = {}) => {
    try {
      setActionLoading(action);
      setActionMessage(null);
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: data.message || "Ação executada com sucesso!" });
        fetchTelemetry();
      } else {
        setActionMessage({ type: "error", text: data.error || "Falha ao executar ação." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Erro de rede: " + err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredLogs = mockLogs.filter(log => {
    if (logsFilter !== "ALL" && log.level !== logsFilter) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-lime-950/20 relative overflow-hidden text-center">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-white tracking-wider uppercase mb-2">SRE Cockpit</h1>
          <p className="text-sm text-slate-400 font-sans mb-6">
            Inicie sessão como administrador para continuar.
          </p>
          <button
            type="button"
            onClick={() => router.push(session ? "/admin" : "/")}
            className="w-full py-3 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black rounded-xl uppercase tracking-widest text-xs transition-all"
          >
            {session ? "Voltar ao Painel" : "Ir para Login"}
          </button>
        </div>
      </div>
    );
  }

  const circuitOpen = telemetry?.subsystems?.crm?.circuitBreaker?.state === "OPEN";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {circuitOpen && (
        <div className="max-w-7xl mx-auto mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm font-bold text-red-300">
            Circuit Breaker do Twenty CRM está OPEN — mutações bloqueadas até recuperação automática.
          </p>
        </div>
      )}

      {/* Header Superior */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">SRE Observability Cockpit</h1>
              <span className="px-2.5 py-0.5 bg-lime-500/10 text-lime-400 border border-lime-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {APP_NAME} Core Engine • Status: Operacional • Uptime: {telemetry ? `${Math.floor(telemetry.uptimeSeconds / 60)}m` : '...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTelemetry}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-lime-400" : ""}`} />
            <span>Atualizar Métricas</span>
          </button>
          
          <button
            onClick={() => setSessionLocked(true)}
            className="px-4 py-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-400 rounded-xl text-xs font-bold transition-all"
          >
            Bloquear Sessão
          </button>
        </div>
      </div>

      {/* Alerta de Feedback de Ações */}
      {actionMessage && (
        <div className="max-w-7xl mx-auto mt-4">
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-sm ${actionMessage.type === 'success' ? 'bg-lime-950/30 border-lime-500/40 text-lime-300' : 'bg-red-950/30 border-red-500/40 text-red-300'}`}>
            <span className="font-mono">{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-xs font-bold uppercase underline">Fechar</button>
          </div>
        </div>
      )}

      {/* Grid de Cartões de Telemetria */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
        {/* Card 1: Twenty CRM & Circuit Breaker */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Twenty CRM API</h3>
            </div>
            {telemetry?.subsystems.crm.status === "HEALTHY" ? (
              <span className="flex items-center gap-1 text-[10px] font-black text-lime-400 bg-lime-500/10 border border-lime-500/20 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                <XCircle className="w-3 h-3" /> FALHA
              </span>
            )}
          </div>

          <div className="space-y-2 font-mono">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Latência GraphQL:</span>
              <span className="font-bold text-white">{telemetry?.subsystems.crm.latencyMs || 0} ms</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Circuit Breaker:</span>
              <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${telemetry?.subsystems.crm.circuitBreaker.state === 'CLOSED' ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
                {telemetry?.subsystems.crm.circuitBreaker.state || "CLOSED"}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button
              onClick={() => executeAction("RESET_CIRCUIT_BREAKER")}
              disabled={actionLoading === "RESET_CIRCUIT_BREAKER"}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-lime-400" /> Reset Circuit Breaker
            </button>
          </div>
        </div>

        {/* Card 2: Transactional Outbox Queue */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Outbox Event Bus</h3>
            </div>
            <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              {telemetry?.subsystems.outbox.pending || 0} PENDENTES
            </span>
          </div>

          <div className="space-y-2 font-mono">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Processados (Sucesso):</span>
              <span className="font-bold text-lime-400">{telemetry?.subsystems.outbox.processed || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Dead-Letter (Falhas):</span>
              <span className="font-bold text-red-400">{telemetry?.subsystems.outbox.failed || 0}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button
              onClick={() => executeAction("REPROCESS_OUTBOX")}
              disabled={actionLoading === "REPROCESS_OUTBOX"}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" /> Forçar Retentativas
            </button>
          </div>
        </div>

        {/* Card 3: AI Cognitive Engine & Semantic Cache */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">IA & Semantic Cache</h3>
            </div>
            <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              {telemetry?.subsystems.aiEngine.cacheEntriesCount || 0} CACHED
            </span>
          </div>

          <div className="space-y-2 font-mono">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Memórias Aprendidas:</span>
              <span className="font-bold text-white">{telemetry?.subsystems.aiEngine.learningsCount || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Latência Resposta:</span>
              <span className="font-bold text-lime-400">&lt; 2 ms (Cache)</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button
              onClick={() => executeAction("CLEAR_SEMANTIC_CACHE")}
              disabled={actionLoading === "CLEAR_SEMANTIC_CACHE"}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-purple-400" /> Limpar Cache Semântico
            </button>
          </div>
        </div>

        {/* Card 4: Field Sync Queue (técnicos em campo) */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sync Offline — Técnicos</h3>
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
              (telemetry?.subsystems.fieldSync?.totalFailed || 0) > 0
                ? "text-red-400 bg-red-500/10 border-red-500/20"
                : "text-amber-400 bg-amber-500/10 border-amber-500/20"
            }`}>
              {(telemetry?.subsystems.fieldSync?.totalFailed || 0)} FALHADOS • {(telemetry?.subsystems.fieldSync?.totalPending || 0)} PENDENTES
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 font-mono text-xs">
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
              <p className="text-slate-500 uppercase text-[10px] font-bold">Técnicos reportados</p>
              <p className="text-xl font-black text-white mt-1">{telemetry?.subsystems.fieldSync?.technicianCount || 0}</p>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
              <p className="text-slate-500 uppercase text-[10px] font-bold">Com falhas</p>
              <p className="text-xl font-black text-red-400 mt-1">{telemetry?.subsystems.fieldSync?.techniciansWithFailures || 0}</p>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
              <p className="text-slate-500 uppercase text-[10px] font-bold">Fila pendente</p>
              <p className="text-xl font-black text-amber-400 mt-1">{telemetry?.subsystems.fieldSync?.totalPending || 0}</p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {(telemetry?.subsystems.fieldSync?.technicians || []).length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-4 text-center">Nenhum técnico reportou estado de sync nas últimas 24h.</p>
            ) : (
              telemetry?.subsystems.fieldSync?.technicians.map((tech) => (
                <div
                  key={tech.technicianId}
                  className={`rounded-xl border p-3 text-xs ${
                    tech.failedCount > 0
                      ? "border-red-500/30 bg-red-500/5"
                      : tech.pendingCount > 0
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-slate-800 bg-slate-950/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{tech.technicianName}</span>
                    <span className={`font-black uppercase text-[10px] ${tech.isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                      {tech.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] font-mono text-slate-400">
                    <span>{tech.pendingCount} pend.</span>
                    <span className={tech.failedCount > 0 ? "text-red-400 font-bold" : ""}>{tech.failedCount} falh.</span>
                    <span>visto {new Date(tech.lastReportAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {tech.failedItems && tech.failedItems.length > 0 && (
                    <p className="mt-2 text-[10px] text-red-300/90 truncate font-mono" title={tech.failedItems[0].lastError}>
                      {tech.failedItems[0].action}: {tech.failedItems[0].lastError || "erro desconhecido"}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 5: Fleet & Location Store */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Location Fleet</h3>
            </div>
            <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              {telemetry?.subsystems.locationTracking.activeCount || 0} ATIVOS
            </span>
          </div>

          <div className="space-y-2 font-mono">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Persistência:</span>
              <span className="font-bold text-white">Híbrida (RAM+Disk)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Heap Memory:</span>
              <span className="font-bold text-white">{telemetry?.memoryUsageMb || 0} MB</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <button
              onClick={triggerQA360Diagnostic}
              disabled={isQaRunning}
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isQaRunning ? "animate-spin" : ""}`} /> 
              {isQaRunning ? "A Executar QA 360..." : "Disparar Teste QA 360"}
            </button>
          </div>
        </div>
      </div>

      {/* Explorador de Logs e Diagnóstico */}
      <div className="max-w-7xl mx-auto bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-lime-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">Live System Logs & Trace Explorer</h2>
          </div>

          {/* Filtros e Pesquisa */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar logs..."
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-200 focus:outline-none focus:border-lime-500 font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {(["ALL", "ERROR", "WARN", "INFO"] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setLogsFilter(lvl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${logsFilter === lvl ? "bg-lime-500 text-slate-950 font-black" : "bg-slate-800 text-slate-400 hover:text-white"}`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Logs */}
        <div className="font-mono text-xs space-y-2 max-h-96 overflow-y-auto pr-2">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-sans text-sm">
              Nenhum log encontrado para os critérios selecionados.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="p-3 bg-slate-950 border border-slate-800/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start md:items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    log.level === 'ERROR' ? 'bg-red-950 text-red-400 border border-red-900' :
                    log.level === 'WARN' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                    'bg-slate-900 text-lime-400 border border-slate-800'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[10px]">
                  <span>{new Date(log.timestamp).toLocaleTimeString('pt-PT')}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(log, null, 2))}
                    className="p-1 hover:text-lime-400 transition-colors"
                    title="Copiar JSON"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE DIAGNÓSTICO QA 360 (ENTERPRISE GRADE) */}
      {isQaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-purple-950/40 overflow-hidden animate-in fade-in zoom-in duration-300">
            
            {/* Header do Modal */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Suite de Diagnóstico Holístico QA 360
                    {qaReport && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        qaReport.overallStatus === 'HEALTHY' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' :
                        qaReport.overallStatus === 'DEGRADED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {qaReport.overallStatus}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Inspeção e benchmark de integridade em 6 vetores arquiteturais
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {qaReport && (
                  <button
                    onClick={downloadReportJson}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="Descarregar JSON"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span className="hidden sm:inline">Exportar JSON</span>
                  </button>
                )}
                <button
                  onClick={() => setIsQaModalOpen(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Diagnóstico */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {isQaRunning ? (
                <div className="py-16 text-center space-y-4">
                  <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
                  <div>
                    <h4 className="text-base font-bold text-white">A Executar Bateria de Testes Sintéticos...</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Aferindo GraphQL, Circuit Breaker, Outbox Queue, Semantic Cache, Geo Engine e Schemas de Segurança.
                    </p>
                  </div>
                </div>
              ) : qaReport ? (
                <>
                  {/* Resumo do Score */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score de Saúde</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-lime-400">{qaReport.score.percentage}%</span>
                        <span className="text-xs font-mono text-slate-400">({qaReport.score.passed}/{qaReport.score.total} PASS)</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tempo de Execução</span>
                      <span className="text-2xl font-black text-white mt-1 font-mono">{qaReport.totalDurationMs} ms</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subsistemas Válidos</span>
                      <span className="text-2xl font-black text-emerald-400 mt-1 font-mono">{qaReport.score.passed}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alertas / Falhas</span>
                      <span className="text-2xl font-black text-amber-400 mt-1 font-mono">{qaReport.score.warned + qaReport.score.failed}</span>
                    </div>
                  </div>

                  {/* Tabela dos 6 Subsistemas */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" /> Relatório por Vetor Arquitetural
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {qaReport.subsystems.map(sub => (
                        <div
                          key={sub.id}
                          className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {sub.status === 'PASS' ? (
                                <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                              ) : sub.status === 'WARN' ? (
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              ) : (
                                <XOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
                              )}
                              <span className="text-xs font-bold text-white tracking-wide">{sub.name}</span>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-purple-400">
                              {sub.latencyMs} ms
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                            {sub.message}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                            <span>Vetor: {sub.category}</span>
                            <span className={`px-1.5 py-0.5 rounded font-black ${
                              sub.status === 'PASS' ? 'bg-lime-950 text-lime-400' :
                              sub.status === 'WARN' ? 'bg-amber-950 text-amber-400' :
                              'bg-red-950 text-red-400'
                            }`}>
                              {sub.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Logs de Execução QA */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-lime-400" /> Log de Execução Sintética
                    </h4>
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto space-y-1">
                      {qaReport.logs.map((l, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="text-slate-600 select-none">&gt;</span>
                          <span>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer do Modal com Ações */}
            <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={triggerCreateSampleLead}
                disabled={actionLoading === "CREATE_SAMPLE"}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4 text-lime-400" />
                {actionLoading === "CREATE_SAMPLE" ? "A Criar no CRM..." : "Criar Lead Exemplar no Twenty CRM"}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={triggerQA360Diagnostic}
                  disabled={isQaRunning}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isQaRunning ? "animate-spin" : ""}`} />
                  Reexecutar Diagnóstico
                </button>
                <button
                  onClick={() => setIsQaModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

