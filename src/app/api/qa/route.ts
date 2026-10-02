import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session.server';
import { isStrictAdminRole } from '@/lib/auth/session';
import { E2ESuiteDepthSchema } from '@/lib/observability/e2eTypes';
import { getLuxuryJob } from '@/lib/observability/luxury/luxuryJobStore';
import { startLuxuryWorkflowJob } from '@/lib/observability/luxury/startLuxuryWorkflowJob';
import { runAndPersistObservabilitySuite } from '@/lib/server/observabilityHistory';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAppSession();

    if (!ctx || !isStrictAdminRole(ctx.user.role!)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Acesso não autorizado. Apenas administradores autenticados podem executar esta ação.' 
        }, 
        { status: 401 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const mode = (body?.mode as string) || 'E2E_FULL_SUITE';

    if (mode === 'E2E_FULL_SUITE') {
      const depthResult = E2ESuiteDepthSchema.safeParse(body?.depth ?? 'safe');
      const depth = depthResult.success ? depthResult.data : 'safe';
      const report = await runAndPersistObservabilitySuite(depth, {
        trigger: 'manual',
        deploymentId: process.env.NEXT_DEPLOYMENT_ID?.trim() || undefined,
      });
      return NextResponse.json({
        success: true,
        mode: 'E2E_FULL_SUITE',
        report,
      });
    }

    if (mode === 'LUXURY_WORKFLOW_E2E') {
      const action = (body?.action as string) || 'start';

      if (action === 'status') {
        const jobId = body?.jobId as string | undefined;
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: 'O jobId é obrigatório para consultar o estado.' },
            { status: 400 }
          );
        }
        const job = getLuxuryJob(jobId);
        if (!job) {
          return NextResponse.json(
            { success: false, error: 'Tarefa do fluxo Luxury não encontrada ou expirada.' },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          mode: 'LUXURY_WORKFLOW_E2E',
          action: 'status',
          job,
          report: job.report,
        });
      }

      const scenarioId = (body?.scenarioId as string) || 'brazil-full-workflow';
      const userId = ctx.user.userId || ctx.user.id || "";
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'ID de membro do workspace em falta na sessão. Termine sessão e volte a entrar.' },
          { status: 400 }
        );
      }

      const job = startLuxuryWorkflowJob(scenarioId, {
        userId,
        userName: ctx.user.name || ctx.user.email || "Luxury E2E Admin",
        email: ctx.user.email || undefined,
      });

      return NextResponse.json({
        success: true,
        mode: 'LUXURY_WORKFLOW_E2E',
        action: 'start',
        jobId: job.id,
        status: job.status,
        message: 'Fluxo Luxury iniciado. Consulte com action=status e jobId.',
      });
    }

    return NextResponse.json(
      { success: false, error: `Modo desconhecido: ${mode}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('QA Execution failed:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
