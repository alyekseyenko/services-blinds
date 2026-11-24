import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session.server";
import { canViewMeasurementSheets } from "@/actions/measurements/shared";
import { fetchMeasurementSheet } from "@/lib/crm/measurements";
import { createOnboardingDemoMeasurementSheet } from "@/lib/demo/demoMeasurementSheet";
import { isOnboardingDemoId } from "@/lib/demo/demoIds";
import { getSheetByOpportunityVersion } from "@/lib/measurements/repo/read";
import { isMeasurementsDbConfigured } from "@/lib/measurements/db/client";
import {
  buildMeasurementsExportFilename,
  buildMeasurementsPdf,
  buildMeasurementsXlsx,
} from "@/lib/measurementsExport";
import type { MeasurementPdfLayout } from "@/lib/measurementsExport/MeasurementPdfDocument";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";

type RouteContext = { params: Promise<{ id: string }> };

function parseVersionParam(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function resolveExportSheet(
  opportunityId: string,
  version: number | null
): Promise<MeasurementSheet | null> {
  if (isOnboardingDemoId(opportunityId)) {
    return createOnboardingDemoMeasurementSheet();
  }
  if (version != null && isMeasurementsDbConfigured()) {
    const byVersion = await getSheetByOpportunityVersion(opportunityId, version);
    if (byVersion) return byVersion;
  }
  return fetchMeasurementSheet(opportunityId);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!canViewMeasurementSheets(auth.user.role)) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await context.params;
    const format = request.nextUrl.searchParams.get("format");
    const versionParam = parseVersionParam(request.nextUrl.searchParams.get("version"));
    const layoutParam = request.nextUrl.searchParams.get("layout");
    const layout: MeasurementPdfLayout = layoutParam === "portrait" ? "portrait" : "landscape";
    if (format !== "xlsx" && format !== "pdf") {
      return NextResponse.json(
        { error: "Formato inválido. Use format=xlsx ou format=pdf." },
        { status: 400 }
      );
    }
    if (layoutParam && layoutParam !== "portrait" && layoutParam !== "landscape") {
      return NextResponse.json(
        { error: "Orientação inválida. Use layout=landscape ou layout=portrait." },
        { status: 400 }
      );
    }
    if (request.nextUrl.searchParams.get("version") && versionParam == null) {
      return NextResponse.json({ error: "Versão inválida." }, { status: 400 });
    }

    const sheet = await resolveExportSheet(id, versionParam);

    if (!sheet) {
      return NextResponse.json(
        { error: "Sem medições registadas para esta oportunidade." },
        { status: 404 }
      );
    }

    const filename = buildMeasurementsExportFilename(sheet, format, layout);
    if (format === "xlsx") {
      const body = await buildMeasurementsXlsx(sheet);
      return new NextResponse(new Uint8Array(body), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdfBody = await buildMeasurementsPdf(sheet, layout);
    return new NextResponse(new Uint8Array(pdfBody), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[measurements/export] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}