import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

async function requireReportConfigSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const roleName = session.user.role?.name;
  if (roleName !== "admin" && roleName !== "consultant" && roleName !== "organization") {
    return { error: NextResponse.json({ error: "Admin, consultant or organization access required" }, { status: 403 }) };
  }

  return { session };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireReportConfigSession();
    if (auth.error) return auth.error;

    const session = auth.session;

    const body = await request.json();
    const organizationUserId = Number(body.organizationUserId);
    const { contentType, base64 } = body;

    if (!organizationUserId || !base64 || !contentType) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!allowed.includes(contentType)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }

    const buf = Buffer.from(base64, "base64");
    if (buf.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Archivo demasiado grande" }, { status: 400 });
    }

    if (session.user.role?.name === "consultant") {
      const consultantId = Number.parseInt(session.user.id, 10);
      const accessibleOrganization = await prisma.user.findFirst({
        where: {
          id: organizationUserId,
          role: { name: "organization" },
          organizationAudits: { some: { consultantId } },
        },
        select: { id: true },
      });

      if (!accessibleOrganization) {
        return NextResponse.json({ error: "Organization not accessible" }, { status: 403 });
      }
    }

    if (session.user.role?.name === "organization" && organizationUserId !== Number.parseInt(session.user.id, 10)) {
      return NextResponse.json({ error: "Organization not accessible" }, { status: 403 });
    }

    // Upsert report display config and save the logo bytes
    // Add timestamp to URL to bypass browser cache
    const timestamp = Date.now();
    const url = `/api/admin/report-config/logo?organizationUserId=${organizationUserId}&t=${timestamp}`;
    const saved = await prisma.reportDisplayConfig.upsert({
      where: { organizationUserId },
      create: {
        organizationUserId,
        logoData: buf,
        logoContentType: contentType,
        logoUrl: url,
      },
      update: {
        logoData: buf,
        logoContentType: contentType,
        logoUrl: url,
      },
      select: { organizationUserId: true },
    });

    return NextResponse.json({ url, saved }, { status: 200 });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
