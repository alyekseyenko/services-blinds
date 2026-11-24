import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session.server";
import { isAdminRole, resolveWorkspaceMemberId } from "@/lib/auth/session";
import { fetchRecentClientRatings } from "@/lib/agenda/clientRatingFeed";

export async function GET() {
  try {
    const auth = await getAppSession();
    if (!auth?.user.role) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const ratings = await fetchRecentClientRatings();
    if (isAdminRole(auth.user.role)) {
      return NextResponse.json({ ratings });
    }

    const memberId = resolveWorkspaceMemberId(auth.user);
    const name = auth.user.name?.trim().toLowerCase() ?? "";
    const own = ratings.filter((item) => {
      if (memberId && item.assigneeId === memberId) return true;
      if (name && item.technicianName?.trim().toLowerCase() === name) return true;
      return false;
    });
    return NextResponse.json({ ratings: own });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[agenda/ratings]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
