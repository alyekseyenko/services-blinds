import { NextRequest, NextResponse } from 'next/server';
import { getAppSession, isAdminRole } from '@/lib/auth/session';
import { runOpportunityMaintenance } from '@/lib/crm/opportunityMaintenance';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth || !isAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const forceRegeocode = searchParams.get('regeocode');

    const result = await runOpportunityMaintenance(forceRegeocode);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in opportunities maintenance:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
