import { NextRequest, NextResponse } from "next/server";
import { fetchOpportunityAttachmentNodes } from "@/lib/crm/visitFiles";
import { isOnboardingDemoId } from "@/lib/demo/demoIds";
import { VisitServiceFilesListResponseSchema } from "@/lib/schemas/visitServiceFiles";
import { mapCrmAttachmentsToList } from "@/lib/visits/visitServiceFiles";
import { assertVisitServiceFilesAccess } from "@/lib/visits/visitServiceFilesAccess";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: opportunityId } = await context.params;
    const taskId = request.nextUrl.searchParams.get("taskId")?.trim() ?? "";
    if (!taskId) {
      return NextResponse.json({ error: "O parâmetro taskId é obrigatório." }, { status: 400 });
    }

    const access = await assertVisitServiceFilesAccess(opportunityId, taskId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (isOnboardingDemoId(opportunityId)) {
      const empty = VisitServiceFilesListResponseSchema.parse({ files: [] });
      return NextResponse.json(empty);
    }

    const nodes = await fetchOpportunityAttachmentNodes(opportunityId);
    const files = mapCrmAttachmentsToList(nodes);
    const payload = VisitServiceFilesListResponseSchema.parse({ files });
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[opportunities/files] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}