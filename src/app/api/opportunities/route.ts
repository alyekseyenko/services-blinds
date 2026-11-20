import { NextRequest, NextResponse } from 'next/server';
import { fetchAdminOpportunities } from '@/lib/crm/opportunities';
import { invalidateAdminCrmCache } from '@/lib/crmCache';
import { CRMError } from '@/lib/crm/errors';
import { CircuitBreakerOpenException } from '@/lib/crm/circuitBreaker';
import { isAdminRole } from '@/lib/auth/session';
import { getAppSession } from '@/lib/auth/session.server';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (!isAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const fresh = request.nextUrl.searchParams.get('fresh') === '1';
    if (fresh) {
      await invalidateAdminCrmCache();
    }

    const opportunities = await fetchAdminOpportunities(fresh ? { fresh: true } : undefined);
    return NextResponse.json(opportunities);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in opportunities API:', error);
    if (error instanceof CircuitBreakerOpenException) {
      return NextResponse.json(
        { error: 'O CRM está temporariamente indisponível. Tente novamente em instantes.', details: message },
        { status: 503 }
      );
    }
    if (error instanceof CRMError) {
      return NextResponse.json(
        { error: 'Não foi possível obter oportunidades no Twenty CRM.', details: message },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
