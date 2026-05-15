import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_REPORT_DISPLAY_CONFIG,
  normalizeReportDisplayConfigInput,
  withDefaultReportConfig,
} from "@/lib/report-config";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  if (session.user.role?.name !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const orgIdParam = request.nextUrl.searchParams.get("organizationUserId");
    const organizations = await prisma.user.findMany({
      where: { role: { name: "organization" } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    let selectedOrganizationId: number | null = null;

    if (orgIdParam) {
      const parsed = parseInt(orgIdParam, 10);
      if (Number.isNaN(parsed)) {
        return NextResponse.json({ error: "Invalid organizationUserId" }, { status: 400 });
      }
      selectedOrganizationId = parsed;
    } else if (organizations.length > 0) {
      selectedOrganizationId = organizations[0].id;
    }

    if (!selectedOrganizationId) {
      return NextResponse.json({
        organizations,
        selectedOrganizationId: null,
        config: { ...DEFAULT_REPORT_DISPLAY_CONFIG },
      });
    }

    const existingConfig = await prisma.reportDisplayConfig.findUnique({
      where: { organizationUserId: selectedOrganizationId },
      select: {
        organizationUserId: true,
        showExecutiveSummary: true,
        showRadar: true,
        showCategorization: true,
        showPrioritization: true,
        showActionPlan: true,
        showScaleLegend: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        headerTitle: true,
        headerSubtitle: true,
        updatedAt: true,
      },
    });

    const normalizedExistingConfig = existingConfig
      ? {
          showExecutiveSummary: existingConfig.showExecutiveSummary,
          showRadar: existingConfig.showRadar,
          showCategorization: existingConfig.showCategorization,
          showPrioritization: existingConfig.showPrioritization,
          showActionPlan: existingConfig.showActionPlan,
          showScaleLegend: existingConfig.showScaleLegend,
          logoUrl: existingConfig.logoUrl,
          primaryColor: existingConfig.primaryColor ?? undefined,
          secondaryColor: existingConfig.secondaryColor ?? undefined,
          headerTitle: existingConfig.headerTitle ?? undefined,
          headerSubtitle: existingConfig.headerSubtitle,
        }
      : null;

    return NextResponse.json({
      organizations,
      selectedOrganizationId,
      config: withDefaultReportConfig(normalizedExistingConfig),
      updatedAt: existingConfig?.updatedAt ?? null,
    });
  } catch (error) {
    console.error("Error getting report config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const session = auth.session!;
    const body = await request.json();
    const organizationUserId = parseInt(String(body.organizationUserId), 10);

    if (Number.isNaN(organizationUserId)) {
      return NextResponse.json({ error: "organizationUserId is required" }, { status: 400 });
    }

    const orgUser = await prisma.user.findUnique({
      where: { id: organizationUserId },
      select: { id: true, role: { select: { name: true } } },
    });

    if (!orgUser || orgUser.role.name !== "organization") {
      return NextResponse.json({ error: "Organization user not found" }, { status: 404 });
    }

    const normalized = normalizeReportDisplayConfigInput(body);

    const saved = await prisma.reportDisplayConfig.upsert({
      where: { organizationUserId },
      create: {
        organizationUserId,
        updatedByAdminId: parseInt(session.user.id, 10),
        ...normalized,
      },
      update: {
        updatedByAdminId: parseInt(session.user.id, 10),
        ...normalized,
      },
      select: {
        organizationUserId: true,
        showExecutiveSummary: true,
        showRadar: true,
        showCategorization: true,
        showPrioritization: true,
        showActionPlan: true,
        showScaleLegend: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        headerTitle: true,
        headerSubtitle: true,
        updatedAt: true,
      },
    });

    const normalizedSavedConfig = {
      showExecutiveSummary: saved.showExecutiveSummary,
      showRadar: saved.showRadar,
      showCategorization: saved.showCategorization,
      showPrioritization: saved.showPrioritization,
      showActionPlan: saved.showActionPlan,
      showScaleLegend: saved.showScaleLegend,
      logoUrl: saved.logoUrl,
      primaryColor: saved.primaryColor ?? undefined,
      secondaryColor: saved.secondaryColor ?? undefined,
      headerTitle: saved.headerTitle ?? undefined,
      headerSubtitle: saved.headerSubtitle,
    };

    return NextResponse.json({
      message: "Configuración del informe almacenada correctamente",
      config: withDefaultReportConfig(normalizedSavedConfig),
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    console.error("Error saving report config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
