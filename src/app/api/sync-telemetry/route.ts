import { NextRequest, NextResponse } from "next/server";
import { isAdminRole, isStrictAdminRole } from "@/lib/auth/session";
import { getAppSession } from '@/lib/auth/session.server';
import { SyncTelemetryReportSchema } from "@/lib/schemas/syncTelemetry";
import { syncTelemetryStore } from "@/lib/syncTelemetryStore";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = SyncTelemetryReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Payload inválido." },
        { status: 400 }
      );
    }

    if (parsed.data.technicianId !== auth.user.id && !isAdminRole(auth.user.role!)) {
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 403 });
    }

    const saved = syncTelemetryStore.upsert(parsed.data);
    return NextResponse.json({ success: true, data: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao registar telemetria.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await getAppSession();
    if (!auth || !isStrictAdminRole(auth.user.role!)) {
      return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
    }

    const summary = syncTelemetryStore.getSummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao obter telemetria.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
