import { NextRequest, NextResponse } from 'next/server';
import { locationStore } from '@/lib/locationStore';
import { isAdminRole } from '@/lib/auth/session';
import { getAppSession } from '@/lib/auth/session.server';

// Rate limiting: mínimo de 5 segundos entre atualizações do mesmo técnico
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_ENTRIES = 500;

function pruneRateLimitMap(now: number): void {
  if (rateLimitMap.size <= RATE_LIMIT_MAX_ENTRIES) return;
  for (const [key, ts] of rateLimitMap.entries()) {
    if (now - ts > RATE_LIMIT_WINDOW_MS * 4) {
      rateLimitMap.delete(key);
    }
  }
}

// Horário de trabalho (07:00 às 22:00) com pausa para almoço protegida (13:00 às 14:00)
const WORK_START_HOUR = 7;
const WORK_END_HOUR = 22;
const LUNCH_START_HOUR = 13;
const LUNCH_END_HOUR = 14;

function isWithinWorkHours(): { allowed: boolean; reason?: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Lisbon',
      hour: 'numeric',
      hour12: false
    });
    const ptHour = parseInt(formatter.format(new Date()), 10);

    // Privacidade: Pausa para almoço
    if (!isNaN(ptHour) && ptHour >= LUNCH_START_HOUR && ptHour < LUNCH_END_HOUR) {
      return { allowed: false, reason: "Pausa de almoço (13:00-14:00) - Privacidade ativa" };
    }

    if (!isNaN(ptHour) && (ptHour < WORK_START_HOUR || ptHour >= WORK_END_HOUR)) {
      return { allowed: false, reason: "Fora da jornada de trabalho (07:00-22:00)" };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * POST /api/location
 * O técnico envia a sua posição GPS.
 * Body: { technicianId, technicianName, lat, lng, accuracy? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const { technicianId: bodyTechnicianId, technicianName, lat, lng, accuracy } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const sessionUserId = auth.user.id;
    const role = auth.user.role;
    const technicianId =
      isAdminRole(role!) && typeof bodyTechnicianId === "string" && bodyTechnicianId
        ? bodyTechnicianId
        : sessionUserId;

    if (technicianId !== sessionUserId && !isAdminRole(role!)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    // Rate Limiting por técnico
    const now = Date.now();
    pruneRateLimitMap(now);
    const lastPostTime = rateLimitMap.get(technicianId) || 0;
    if (now - lastPostTime < RATE_LIMIT_WINDOW_MS) {
      return NextResponse.json({ 
        status: "rate_limited", 
        message: "Atualização demasiado rápida. A aguardar intervalo." 
      }, { status: 200 });
    }
    rateLimitMap.set(technicianId, now);

    const check = isWithinWorkHours();
    if (!check.allowed) {
      return NextResponse.json({ 
        status: "paused", 
        reason: check.reason 
      }, { status: 200 });
    }

    await locationStore.save({
      technicianId,
      technicianName: technicianName || "Técnico",
      lat,
      lng,
      lastUpdate: new Date().toISOString(),
      accuracy
    });

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Location API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/location
 * O Admin busca as posições de todos os técnicos ativos em tempo real.
 * Devolve técnicos que tenham enviado posição nos últimos 5 minutos (evita mostrar quem já desligou).
 */
export async function GET() {
  try {
    const auth = await getAppSession();
    if (!auth?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!isAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const activeTechnicians = await locationStore.getActive(5 * 60 * 1000);
    return NextResponse.json({ technicians: activeTechnicians });
  } catch (error: any) {
    console.error("[Location API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/location
 * Remove imediatamente a posição do técnico quando ele faz logout ou revoga consentimento RGPD.
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technicianId');
    if (technicianId) {
      if (technicianId !== auth.user.id && !isAdminRole(auth.user.role!)) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
      }
      await locationStore.remove(technicianId);
      return NextResponse.json({ status: "removed" });
    }
    return NextResponse.json({ error: "technicianId is required" }, { status: 400 });
  } catch (error: any) {
    console.error("[Location API DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
