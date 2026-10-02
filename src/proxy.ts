import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { AppRole } from "@/lib/schemas/auth";
import {
  canAccessAdminPanel,
  canAccessCeoPanel,
  canAccessTechnicianDashboard,
  isStrictAdminRole,
  isWarehouseRole,
} from "@/lib/auth/rbac";

function roleFromToken(tokenRole: unknown): AppRole | null {
  return typeof tokenRole === "string" ? (tokenRole as AppRole) : null;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const nextAction = req.headers.get("next-action");
    if (nextAction && !token) {
      return new NextResponse("Não autenticado.", {
        status: 401,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const pathname = req.nextUrl.pathname;
    const isApiRoute = pathname.startsWith("/api/");
    const role = roleFromToken(token?.role);

    if (isApiRoute) {
      if (!token || !role) {
        return NextResponse.json(
          { error: "Não autenticado. Faça login para aceder a esta API." },
          { status: 401 }
        );
      }

      if (
        pathname.startsWith("/api/opportunities/maintenance") &&
        !canAccessAdminPanel(role)
      ) {
        return NextResponse.json(
          { error: "Acesso não autorizado." },
          { status: 403 }
        );
      }

      if (
        pathname.startsWith("/api/sync-telemetry") &&
        req.method === "GET" &&
        !isStrictAdminRole(role)
      ) {
        return NextResponse.json(
          { error: "Acesso não autorizado. Apenas administradores podem aceder a esta API." },
          { status: 403 }
        );
      }

      const strictAdminApis = ["/api/qa", "/api/observability"];
      if (
        strictAdminApis.some((prefix) => pathname.startsWith(prefix)) &&
        !isStrictAdminRole(role)
      ) {
        return NextResponse.json(
          { error: "Acesso não autorizado. Apenas administradores podem aceder a esta API." },
          { status: 403 }
        );
      }

      return NextResponse.next();
    }

    if (pathname.startsWith("/admin/observabilidade") && role && !isStrictAdminRole(role)) {
      const fallback = canAccessCeoPanel(role) ? "/ceo" : "/";
      return NextResponse.redirect(new URL(fallback, req.url));
    }

    if (pathname.startsWith("/admin") && role && !canAccessAdminPanel(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/ceo") && role && !canAccessCeoPanel(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/armazem") && role && !isWarehouseRole(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/dashboard") && role && !canAccessTechnicianDashboard(role)) {
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
        if (req.headers.get("next-action") && !token) {
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
  ],
};
