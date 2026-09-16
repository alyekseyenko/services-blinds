import { NextResponse } from 'next/server';
import { fetchWorkspaceMembers } from '@/lib/crm';
import { getAppSession, isAdminRole } from '@/lib/auth/session';

export async function GET() {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (!isAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const members = await fetchWorkspaceMembers();
    return NextResponse.json(members);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in members API bridge:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
