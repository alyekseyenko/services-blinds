import { NextRequest, NextResponse } from "next/server";
import { fetchAdminHistoryPage } from "@/lib/crm/opportunities";
import { invalidateAdminCrmCache } from "@/lib/crmCache";
import { isAdminRole } from "@/lib/auth/session";
import { getAppSession } from '@/lib/auth/session.server';
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import { parseHistoryYmd } from "@/lib/visits/historyFilters";

const HISTORY_OUTCOMES = new Set<MapHistoryOutcome>(["completed", "incomplete", "cancelled"]);

function parseOutcomes(value: string | null): MapHistoryOutcome[] | undefined {
  if (!value) return undefined;
  const outcomes = value
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is MapHistoryOutcome => HISTORY_OUTCOMES.has(part as MapHistoryOutcome));
  return outcomes.length > 0 ? outcomes : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (!isAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const pageParam = request.nextUrl.searchParams.get("page");
    const pageSizeParam = request.nextUrl.searchParams.get("pageSize");
    const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam ? Number.parseInt(pageSizeParam, 10) : undefined;

    if (Number.isNaN(page) || (pageSizeParam && Number.isNaN(pageSize))) {
      return NextResponse.json({ error: "Parâmetros de paginação inválidos." }, { status: 400 });
    }

    const outcomes = parseOutcomes(request.nextUrl.searchParams.get("outcomes"));
    const fromRaw = request.nextUrl.searchParams.get("from");
    const toRaw = request.nextUrl.searchParams.get("to");
    if (fromRaw && !parseHistoryYmd(fromRaw)) {
      return NextResponse.json({ error: "Data inicial inválida." }, { status: 400 });
    }
    if (toRaw && !parseHistoryYmd(toRaw)) {
      return NextResponse.json({ error: "Data final inválida." }, { status: 400 });
    }
    const from = parseHistoryYmd(fromRaw);
    const to = parseHistoryYmd(toRaw);
    const withCoordinates = request.nextUrl.searchParams.get("withCoordinates") === "1";
    const fresh = request.nextUrl.searchParams.get("fresh") === "1";
    const q = request.nextUrl.searchParams.get("q")?.trim() || null;
    const technician = request.nextUrl.searchParams.get("technician")?.trim() || null;
    if (fresh) {
      await invalidateAdminCrmCache();
    }
    const result = await fetchAdminHistoryPage(page, pageSize, {
      outcomes,
      withCoordinates,
      fresh,
      from,
      to,
      q,
      technician,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error in opportunities history API:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
