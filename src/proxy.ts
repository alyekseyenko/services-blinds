import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { AppRole } from "@/lib/schemas/auth";

function hasRole(tokenRole: unknown, allowedRoles: AppRole[]): boolean {
  return typeof tokenRole === "string" && allowedRoles.includes(tokenRole as AppRole);
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const isApiRoute = pathname.startsWith("/api/");
    const role = token?.role;

    if (isApiRoute) {
      if (!token) {
        return NextResponse.json(
          { error: "Não autenticado. Faça login para aceder a esta API." },
          { status: 401 }
        );
      }

      if (
        pathname.startsWith("/api/opportunities/maintenance") &&
        !hasRole(role, ["admin", "member", "ceo"])
      ) {
        return NextResponse.json(
          { error: "Acesso não autorizado." },
          { status: 403 }
        );
      }

      // Technicians POST sync reports; only admins may read the aggregated summary.
      if (pathname.startsWith("/api/sync-telemetry") && req.method === "GET" && role !== "admin") {
        return NextResponse.json(
          { error: "Acesso não autorizado. Apenas administradores podem aceder a esta API." },
          { status: 403 }
        );
      }

      const strictAdminApis = ["/api/qa", "/api/observability"];
      if (strictAdminApis.some((prefix) => pathname.startsWith(prefix)) && role !== "admin") {
        return NextResponse.json(
          { error: "Acesso não autorizado. Apenas administradores podem aceder a esta API." },
          { status: 403 }
        );
      }

      return NextResponse.next();
    }

    if (pathname.startsWith("/admin/observabilidade") && role !== "admin") {
      const fallback = role === "ceo" ? "/ceo" : "/";
      return NextResponse.redirect(new URL(fallback, req.url));
    }

    if (pathname.startsWith("/admin") && !hasRole(role, ["admin", "member", "ceo"])) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/ceo") && !hasRole(role, ["admin", "ceo"])) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/armazem") && !hasRole(role, ["warehouse"])) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (
      pathname.startsWith("/dashboard") &&
      !hasRole(role, ["technician", "admin"])
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const publicPaths = ["/api/auth", "/api/health", "/avaliacao", "/cancelamento"];
        const pathname = req.nextUrl.pathname;
        if (publicPaths.some((p) => pathname.startsWith(p))) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/ceo/:path*",
    "/armazem/:path*",
    "/avaliacao/:path*",
    "/cancelamento/:path*",
    "/api/opportunities/:path*",
    "/api/tasks/:path*",
    "/api/members/:path*",
    "/api/location",
    "/api/location/:path*",
    "/api/qa/:path*",
    "/api/observability/:path*",
    "/api/sync-telemetry/:path*",
    "/api/push/:path*",
  ],
};
