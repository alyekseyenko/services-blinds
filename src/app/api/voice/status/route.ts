import { NextResponse } from "next/server";
import { canAccessTechnicianDashboard } from "@/lib/auth/rbac";
import { getAppSession } from "@/lib/auth/session.server";
import {
  isGoogleStreamingConfigured,
  isSpeechProviderConfigured,
  isSummarizeConfigured,
} from "@/lib/voice/provider";

export async function GET() {
  const ctx = await getAppSession();
  if (!ctx?.user.role || !canAccessTechnicianDashboard(ctx.user.role)) {
    return NextResponse.json(
      { success: false, error: "Acesso não autorizado." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      available: isSpeechProviderConfigured(),
      streamingAvailable: isGoogleStreamingConfigured(),
      summarizeAvailable: isSummarizeConfigured(),
    },
  });
}
