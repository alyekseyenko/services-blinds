import { NextRequest, NextResponse } from 'next/server';
import { isStrictAdminRole } from '@/lib/auth/rbac';
import { getAppSession } from '@/lib/auth/session.server';
import { crmCircuitBreaker } from '@/lib/crm/circuitBreaker';
import { outboxQueue } from '@/lib/outboxQueue';
import { locationStore } from '@/lib/locationStore';
import { logger } from '@/lib/logger';
import { syncTelemetryStore } from '@/lib/syncTelemetryStore';
import { E2ESuiteDepthSchema } from '@/lib/observability/e2eTypes';
import { runAndPersistObservabilitySuite } from '@/lib/server/observabilityHistory';
import { cleanupStaleLuxuryE2eData } from '@/lib/crm/e2eFixtures';


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

    try {
      const { probeGraphql } = await import('@/lib/server/healthProbes');
      const crmStart = Date.now();
      const graphql = await probeGraphql();
      crmLatencyMs = Date.now() - crmStart;
      if (graphql.status !== 'connected') {
        crmStatus = 'UNHEALTHY';
        crmError = graphql.error ?? 'CRM indisponível';
      }
    } catch (err: unknown) {
      crmStatus = 'UNHEALTHY';
      crmError = err instanceof Error ? err.message : 'CRM probe failed';
      crmLatencyMs = Date.now() - startTime;
    }

    const circuitBreakerState = crmCircuitBreaker.getState();
    const outboxStats = outboxQueue.getStats();
    const activeTechnicians = await locationStore.getActive();
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
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
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

      case 'REPROCESS_OUTBOX': {
        const result = await outboxQueue.processPending();
        logger.info(`[SRE Action] Outbox reprocessed: ${result.processed} ok, ${result.failed} failed, ${result.pruned} pruned`);
        return NextResponse.json({ 
          success: true, 
          message: `Outbox processed: ${result.processed} delivered, ${result.failed} failed, ${result.pruned} stale removed.` 
        });
      }

      case 'REQUEUE_FAILED': {
        const requeued = await outboxQueue.requeueFailedEvents();
        logger.info(`[SRE Action] Outbox requeued failed: ${requeued.requeued}`);
        return NextResponse.json({
          success: true,
          message: `${requeued.requeued} evento(s) falhado(s) voltaram a PENDING.`,
        });
      }

      case 'PRUNE_STALE_OUTBOX': {
        const pruned = outboxQueue.pruneStalePending();
        logger.info(`[SRE Action] Outbox stale prune: ${pruned.pruned} removed`);
        return NextResponse.json({
          success: true,
          message: `Removed ${pruned.pruned} stale localhost event(s). ${pruned.remaining} event(s) remain.`,
        });
      }

      case 'RUN_E2E_SUITE': {
        const depthResult = E2ESuiteDepthSchema.safeParse(body?.depth ?? 'safe');
        const depth = depthResult.success ? depthResult.data : 'safe';
        const report = await runAndPersistObservabilitySuite(depth, {
          trigger: 'manual',
          deploymentId: process.env.NEXT_DEPLOYMENT_ID?.trim() || undefined,
        });
        return NextResponse.json({ success: true, report });
      }

      case 'CLEANUP_LUXURY_E2E': {
        const result = await cleanupStaleLuxuryE2eData();
        return NextResponse.json({
          success: true,
          message: `Limpeza E2E: ${result.personsDeleted} pessoa(s), ${result.opportunitiesDeleted} oportunidade(s), ${result.tasksDeleted} tarefa(s), ${result.notesDeleted} nota(s).`,
          result,
        });
      }

      case 'CLEAR_LOGS':
        logger.clearLogs();
        return NextResponse.json({ success: true, message: 'Logs em memória limpos com sucesso.' });

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
