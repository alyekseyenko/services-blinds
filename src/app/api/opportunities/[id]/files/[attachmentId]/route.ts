import { NextRequest, NextResponse } from "next/server";
import { fetchOpportunityAttachmentFileMeta } from "@/lib/crm/visitFiles";
import { isOnboardingDemoId } from "@/lib/demo/demoIds";
import { contentTypeForVisitFileExtension } from "@/lib/visits/visitServiceFiles";
import { assertVisitServiceFilesAccess } from "@/lib/visits/visitServiceFilesAccess";

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: opportunityId, attachmentId } = await context.params;
    const taskId = request.nextUrl.searchParams.get("taskId")?.trim() ?? "";
    if (!taskId) {
      return NextResponse.json({ error: "O parâmetro taskId é obrigatório." }, { status: 400 });
    }

    const access = await assertVisitServiceFilesAccess(opportunityId, taskId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (isOnboardingDemoId(opportunityId)) {
      return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });
    }

    const meta = await fetchOpportunityAttachmentFileMeta(opportunityId, attachmentId);
    if (!meta) {
      return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });
    }

    const upstream = await fetch(meta.signedUrl, {
      method: "GET",
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstream.ok) {
      console.error(
        `[opportunities/files/${attachmentId}] Upstream HTTP ${upstream.status}`
      );
      return NextResponse.json(
        { error: "Não foi possível obter o ficheiro do CRM." },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() ||
      contentTypeForVisitFileExtension(meta.extension);

    const body = upstream.body;
    if (!body) {
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=300",
          "Content-Disposition": `inline; filename="${encodeURIComponent(meta.name)}"`,
        },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="${encodeURIComponent(meta.name)}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[opportunities/files/attachment] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}