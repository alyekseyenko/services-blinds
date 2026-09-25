import { NextRequest, NextResponse } from "next/server";
import { fetchAdminHistoryPage } from "@/lib/crm/opportunities";
import { isAdminRole } from "@/lib/auth/session";
import { getAppSession } from '@/lib/auth/session.server';

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

    const result = await fetchAdminHistoryPage(page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error in opportunities history API:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
