import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session.server";
import { isAdminRole } from "@/lib/auth/session";
import { fetchMeasurementSheet } from "@/lib/crm/measurements";
import { createOnboardingDemoMeasurementSheet } from "@/lib/onboarding/demoMeasurementSheet";
import { isOnboardingDemoId } from "@/lib/onboarding/demoMapPin";
import {
  buildMeasurementsExportFilename,
  buildMeasurementsPdf,
  buildMeasurementsXlsx,
} from "@/lib/measurementsExport";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAppSession();
    if (!auth) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!isAdminRole(auth.user.role!)) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await context.params;
    const format = request.nextUrl.searchParams.get("format");
    if (format !== "xlsx" && format !== "pdf") {
      return NextResponse.json(
        { error: "Formato inválido. Use format=xlsx ou format=pdf." },
        { status: 400 }
      );
    }

    const sheet = isOnboardingDemoId(id)
      ? createOnboardingDemoMeasurementSheet()
      : await fetchMeasurementSheet(id);

    if (!sheet) {
      return NextResponse.json(
        { error: "Sem medições registadas para esta oportunidade." },
        { status: 404 }
      );
    }

    const filename = buildMeasurementsExportFilename(sheet, format);
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

    const pdfBody = await buildMeasurementsPdf(sheet);
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
