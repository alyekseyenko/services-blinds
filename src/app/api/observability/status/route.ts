import { NextResponse } from "next/server";
import { isStrictAdminRole } from "@/lib/auth/rbac";
import { getAppSession } from "@/lib/auth/session.server";
import { getObservabilityStatus } from "@/lib/server/observabilityHistory";

export async function GET() {
  const auth = await getAppSession();
  if (!auth || !isStrictAdminRole(auth.user.role!)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const status = getObservabilityStatus();
  return NextResponse.json(status);
}
