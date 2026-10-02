import { NextRequest, NextResponse } from "next/server";
import { fetchAdminOpportunityLookup } from "@/lib/crm/opportunities";
import { CRMError } from "@/lib/crm/client";
import { CircuitBreakerOpenException } from "@/lib/crm/circuitBreaker";
import { isAdminRole } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (!isAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const taskId = request.nextUrl.searchParams.get("taskId")?.trim() || undefined;
    const opportunityId = request.nextUrl.searchParams.get("opportunityId")?.trim() || undefined;

    if (!taskId && !opportunityId) {
      return NextResponse.json(
        { error: "Indique taskId ou opportunityId." },
        { status: 400 }
      );
    }

    const opportunity = await fetchAdminOpportunityLookup({ taskId, opportunityId });
    if (!opportunity) {
      return NextResponse.json({ error: "Serviço não encontrado no CRM." }, { status: 404 });
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Error in opportunities lookup API:", error);
    if (error instanceof CircuitBreakerOpenException) {
      return NextResponse.json(
        { error: "O CRM está temporariamente indisponível. Tente novamente em instantes.", details: message },
        { status: 503 }
      );
    }
    if (error instanceof CRMError) {
      return NextResponse.json(
        { error: "Não foi possível obter o serviço no Twenty CRM.", details: message },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
