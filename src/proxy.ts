// src/proxy.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const user = req.nextauth.token;
    const rawRole = typeof user?.role === "string" ? user.role : user?.role?.name;
    const roleName = rawRole?.toLowerCase();

    // Ignorar archivos estaticos y rutas publicas
    const PUBLIC_FILE = /\.(.*)$/;
    const isPublicRoute = [
      "/auth",
      "/auth/card",
      "/api/auth",
      "/favicon.ico",
      "/logo.svg",
    ].some((path) => pathname.startsWith(path));

    const isStaticFile = PUBLIC_FILE.test(pathname);

    if (isPublicRoute || isStaticFile) {
      return NextResponse.next();
    }

    // Si no hay usuario autenticado, redirige a login
    if (!user) {
      return NextResponse.redirect(new URL("/auth/card", req.url));
    }

    // Rutas protegidas por rol
    if (
      (pathname.startsWith("/dashboard/admin") || pathname.startsWith("/api/admin")) &&
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
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
