import { NextResponse } from 'next/server';
import { fetchAdminOpportunities } from '@/lib/crm/opportunities';
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

    const opportunities = await fetchAdminOpportunities();
    return NextResponse.json(opportunities);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in opportunities API:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
