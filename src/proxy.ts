// src/proxy.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/_next")) {
    return true;
  }

  if (PUBLIC_FILE.test(pathname)) {
    return true;
  }

  return [
    "/auth",
    "/auth/card",
    "/api/auth",
    "/favicon.ico",
    "/logo.svg",
  ].some((path) => pathname.startsWith(path));
}

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const user = req.nextauth.token;
    const rawRole = typeof user?.role === "string" ? user.role : user?.role?.name;
    const roleName = rawRole?.toLowerCase();

    // Ignorar archivos estaticos y rutas publicas
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    // Si no hay usuario autenticado, redirige a login
    if (!user) {
      return NextResponse.redirect(new URL("/auth/card", req.url));
    }

    // Rutas protegidas por rol
    const isReportConfigApi = pathname.startsWith("/api/admin/report-config");

    if (
      pathname.startsWith("/dashboard/admin") &&
      roleName !== "admin"
    ) {
      return NextResponse.redirect(new URL("/auth/card", req.url));
    }

    if (
      pathname.startsWith("/api/admin") &&
      !isReportConfigApi &&
      roleName !== "admin"
    ) {
      return NextResponse.redirect(new URL("/auth/card", req.url));
    }

    if (
      (pathname.startsWith("/dashboard/consultant") || pathname.startsWith("/api/consultant")) &&
      roleName !== "consultant"
    ) {
      return NextResponse.redirect(new URL("/auth/card", req.url));
    }

    if (pathname.startsWith("/dashboard/organization") || pathname.startsWith("/api/organization")) {
      const isOrganization = roleName === "organization";
      const isConsultant = roleName === "consultant";

      if (!isOrganization && !isConsultant) {
        return NextResponse.redirect(new URL("/auth/card", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/card",
    },
    callbacks: {
      authorized: ({ req, token }) => {
        if (isPublicPath(req.nextUrl.pathname)) {
          return true;
        }

        return !!token;
      },
    },
  }
);
