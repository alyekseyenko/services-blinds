import { NextRequest, NextResponse } from 'next/server';
import { isAdminRole } from '@/lib/auth/session';
import { getAppSession } from '@/lib/auth/session.server';
import { runOpportunityMaintenance } from '@/lib/crm/opportunityMaintenance';
import { runMaintenanceThrottled } from '@/lib/server/maintenanceThrottle';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth || !isAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const forceRegeocode = searchParams.get('regeocode');

    const throttled = await runMaintenanceThrottled(() =>
      runOpportunityMaintenance(forceRegeocode)
    );
    if (throttled.skipped) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: throttled.reason,
      });
    }

    const result = throttled.data;
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in opportunities maintenance:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
