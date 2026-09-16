import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, isStrictAdminRole } from '@/lib/auth/session';
import { crmCircuitBreaker } from '@/lib/crm/circuitBreaker';
import { outboxQueue } from '@/lib/outboxQueue';
import { locationStore } from '@/lib/locationStore';
import { semanticAiCache } from '@/lib/ai/semanticCache';
import { crmFetch } from '@/lib/crm/client';
import { getLearnings, getPerformanceInsights } from '@/lib/agentMemory';
import { logger } from '@/lib/logger';
import { syncTelemetryStore } from '@/lib/syncTelemetryStore';


export async function GET() {
  try {
    const auth = await getAppSession();
    if (!auth || !isStrictAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const startTime = Date.now();
    let crmStatus = 'HEALTHY';
    let crmLatencyMs = 0;
    let crmError: string | null = null;

    // Testar conectividade com o Twenty CRM
    try {
      const crmStart = Date.now();
      await crmFetch<{ health?: string }>(`query { __typename }`, {}, { timeoutMs: 5000, maxRetries: 1 });
      crmLatencyMs = Date.now() - crmStart;
    } catch (err: any) {
      crmStatus = 'UNHEALTHY';
      crmError = err.message;
      crmLatencyMs = Date.now() - startTime;
    }

    // Obter métricas dos subsistemas
    const circuitBreakerState = crmCircuitBreaker.getState();
    const outboxStats = outboxQueue.getStats();
    const activeTechnicians = await locationStore.getActive();
    const aiCacheStats = semanticAiCache.getStats();
    const aiLearnings = await getLearnings();
    const opsInsights = await getPerformanceInsights();
    const recentLogs = logger.getRecentLogs(50);
    const fieldSync = syncTelemetryStore.getSummary();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      logs: recentLogs,
      subsystems: {
        crm: {
          status: crmStatus,
          latencyMs: crmLatencyMs,
          error: crmError,
          circuitBreaker: {
            state: circuitBreakerState,
          }
        },
        outbox: {
          ...outboxStats,
        },
        locationTracking: {
          activeCount: activeTechnicians.length,
          technicians: activeTechnicians,
        },
        fieldSync: {
          technicianCount: fieldSync.technicianCount,
          totalPending: fieldSync.totalPending,
          totalFailed: fieldSync.totalFailed,
          techniciansWithFailures: fieldSync.techniciansWithFailures,
          technicians: fieldSync.technicians,
        },
        aiEngine: {
          cacheEntriesCount: aiCacheStats.size,
          cacheStats: aiCacheStats,
          learningsCount: aiLearnings.length,
          performanceInsights: opsInsights,
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth || !isStrictAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'RESET_CIRCUIT_BREAKER':
        crmCircuitBreaker.reset();
        logger.info('[SRE Action] Circuit Breaker reset to CLOSED by Creator');
        return NextResponse.json({ success: true, message: 'Circuit Breaker reiniciado para CLOSED.' });

      case 'REPROCESS_OUTBOX':
        const result = await outboxQueue.processPending();
        logger.info(`[SRE Action] Outbox reprocessed: ${result.processed} ok, ${result.failed} failed`);
        return NextResponse.json({ 
          success: true, 
          message: `Fila Outbox processada: ${result.processed} processados, ${result.failed} falhados.` 
        });

      case 'CLEAR_SEMANTIC_CACHE':
        semanticAiCache.clear();
        logger.info('[SRE Action] Semantic AI Cache cleared by Creator');
        return NextResponse.json({ success: true, message: 'Cache Semântico de IA limpo com sucesso.' });

      case 'CLEAR_LOGS':
        logger.clearLogs();
        return NextResponse.json({ success: true, message: 'Logs em memória limpos com sucesso.' });

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
