import { NextRequest, NextResponse } from 'next/server';
import { fetchTechnicianTasks } from '@/lib/crm/tasks';
import { isAdminRole, technicianIdMatchesSession } from '@/lib/auth/session';
import { getAppSession } from '@/lib/auth/session.server';
import { CRMError } from '@/lib/crm/client';
import { CircuitBreakerOpenException } from '@/lib/crm/circuitBreaker';
import type { AppTask } from '@/lib/crm/schemas';

function serializeTasksForClient(tasks: AppTask[]) {
  return tasks.map((task) => ({
    ...task,
    dueDate: task.dueDate.toISOString(),
    updatedAt: task.updatedAt?.toISOString(),
    nsi: task.nsi != null ? String(task.nsi) : "N/A",
  }));
}

function tasksJsonResponse(tasks: AppTask[]) {
  try {
    return NextResponse.json(serializeTasksForClient(tasks));
  } catch (serializeError) {
    console.error("Error serializing tasks JSON:", serializeError);
    return NextResponse.json(
      { error: "Não foi possível preparar a resposta da agenda." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get('technicianId');
    const sessionMemberId = auth.user.id;

    if (isAdminRole(auth.user.role!)) {
      const technicianId = requestedId || sessionMemberId;
      if (!technicianId) {
        return NextResponse.json({ error: 'O ID do técnico é obrigatório.' }, { status: 400 });
      }
      const tasks = await fetchTechnicianTasks(technicianId);
      return tasksJsonResponse(tasks);
    }

    if (!technicianIdMatchesSession(requestedId, auth.user)) {
      return NextResponse.json(
        { error: 'Não autorizado a consultar tarefas de outro técnico.' },
        { status: 403 }
      );
    }

    const tasks = await fetchTechnicianTasks(sessionMemberId);
    return tasksJsonResponse(tasks);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error fetching tasks:', error);
    if (error instanceof CircuitBreakerOpenException) {
      return NextResponse.json(
        { error: 'O CRM está temporariamente indisponível. Tente novamente em instantes.', details: message },
        { status: 503 }
      );
    }
    if (error instanceof CRMError) {
      return NextResponse.json(
        { error: 'Não foi possível obter as tarefas no Twenty CRM.', details: message },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: 'Não foi possível obter as tarefas.', details: message }, { status: 500 });
  }
}
