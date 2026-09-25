import { NextRequest, NextResponse } from 'next/server';
import { fetchTechnicianTasks, updateTaskStatus, getTaskAssigneeId } from '@/lib/crm/tasks';
import { isAdminRole } from '@/lib/auth/session';
import { getAppSession } from '@/lib/auth/session.server';

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
        return NextResponse.json({ error: 'Technician ID is required' }, { status: 400 });
      }
      const tasks = await fetchTechnicianTasks(technicianId);
      return NextResponse.json(tasks);
    }

    if (requestedId && requestedId !== sessionMemberId) {
      return NextResponse.json(
        { error: 'Não autorizado a consultar tarefas de outro técnico.' },
        { status: 403 }
      );
    }

    const tasks = await fetchTechnicianTasks(sessionMemberId);
    return NextResponse.json(tasks);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks', details: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, report, photos } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios.' }, { status: 400 });
    }

    if (!isAdminRole(auth.user.role!)) {
      const assigneeId = await getTaskAssigneeId(id);
      if (!assigneeId || assigneeId !== auth.user.id) {
        return NextResponse.json(
          { error: 'Não autorizado a atualizar esta tarefa.' },
          { status: 403 }
        );
      }
    }

    const result = await updateTaskStatus(id, status, report, photos || []);
    return NextResponse.json({ success: true, task: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task in Twenty CRM', details: message },
      { status: 500 }
    );
  }
}
