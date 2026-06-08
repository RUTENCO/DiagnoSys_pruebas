import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_REPORT_DISPLAY_CONFIG,
  normalizeReportDisplayConfigInput,
  withDefaultReportConfig,
} from "@/lib/report-config";

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireReportConfigSession();
    if (auth.error) return auth.error;

    const session = auth.session;

    const orgIdParam = request.nextUrl.searchParams.get("organizationUserId");
    const consultantId = Number.parseInt(session.user.id, 10);
    const roleName = session.user.role?.name;
    let organizations: Array<{ id: number; name: string; email: string }>;

    if (roleName === "consultant") {
      const consultantOrganizations = await prisma.consultantOrganization.findMany({
        where: {
          consultantId,
          linkedUserId: { not: null },
        },
        select: {
          name: true,
          email: true,
          linkedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      organizations = consultantOrganizations
        .filter((organization) => organization.linkedUser)
        .map((organization) => ({
          id: organization.linkedUser!.id,
          name: organization.name,
          email: organization.email,
        }));
    } else if (roleName === "organization") {
      organizations = [
        {
          id: Number.parseInt(session.user.id, 10),
          name: session.user.name || "Organización",
          email: session.user.email || "",
        },
      ];
    } else {
      organizations = await prisma.user.findMany({
        where: { role: { name: "organization" } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
    }

    let selectedOrganizationId: number | null = null;

    if (orgIdParam) {
      const parsed = Number.parseInt(orgIdParam, 10);
      if (Number.isNaN(parsed)) {
        return NextResponse.json({ error: "Invalid organizationUserId" }, { status: 400 });
      }
      selectedOrganizationId = parsed;
    } else if (organizations.length > 0) {
      selectedOrganizationId = organizations[0].id;
    }

    if (selectedOrganizationId && !organizations.some((organization) => organization.id === selectedOrganizationId)) {
      return NextResponse.json({ error: "Organization not accessible" }, { status: 403 });
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

    // Regenerate logoUrl with fresh timestamp to bypass browser cache
    let logoUrl = existingConfig?.logoUrl ?? null;
    if (logoUrl?.includes("/api/admin/report-config/logo")) {
      logoUrl = `/api/admin/report-config/logo?organizationUserId=${selectedOrganizationId}&t=${Date.now()}`;
    }

    const normalizedExistingConfig = existingConfig
      ? {
          showExecutiveSummary: existingConfig.showExecutiveSummary,
          showRadar: existingConfig.showRadar,
          showCategorization: existingConfig.showCategorization,
          showPrioritization: existingConfig.showPrioritization,
          showActionPlan: existingConfig.showActionPlan,
          showScaleLegend: existingConfig.showScaleLegend,
          logoUrl: logoUrl,
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
    const auth = await requireReportConfigSession();
    if (auth.error) return auth.error;

    const session = auth.session;
    const body = await request.json();
    const organizationUserId = Number.parseInt(String(body.organizationUserId), 10);

    if (Number.isNaN(organizationUserId)) {
      return NextResponse.json({ error: "organizationUserId is required" }, { status: 400 });
    }

    const orgUser = await prisma.user.findUnique({
      where: { id: organizationUserId },
      select: { id: true, role: { select: { name: true } } },
    });

    if (orgUser?.role.name !== "organization") {
      return NextResponse.json({ error: "Organization user not found" }, { status: 404 });
    }

    if (session.user.role?.name === "consultant") {
      const consultantId = Number.parseInt(session.user.id, 10);
      const accessibleOrganization = await prisma.consultantOrganization.findFirst({
        where: {
          consultantId,
          linkedUserId: organizationUserId,
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

    const normalized = normalizeReportDisplayConfigInput(body);

    const updateData: any = {
      updatedByAdminId: Number.parseInt(session.user.id, 10),
      showExecutiveSummary: normalized.showExecutiveSummary,
      showRadar: normalized.showRadar,
      showCategorization: normalized.showCategorization,
      showPrioritization: normalized.showPrioritization,
      showActionPlan: normalized.showActionPlan,
      showScaleLegend: normalized.showScaleLegend,
      headerTitle: normalized.headerTitle,
      headerSubtitle: normalized.headerSubtitle,
      primaryColor: normalized.primaryColor,
      secondaryColor: normalized.secondaryColor,
      ...(body.logoUrl !== undefined && { logoUrl: normalized.logoUrl }),
    };

    const savedConfig = await prisma.reportDisplayConfig.upsert({
      where: { organizationUserId },
      create: {
        organizationUserId,
        updatedByAdminId: Number.parseInt(session.user.id, 10),
        ...normalized,
      },
      update: updateData,
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
      showExecutiveSummary: savedConfig.showExecutiveSummary,
      showRadar: savedConfig.showRadar,
      showCategorization: savedConfig.showCategorization,
      showPrioritization: savedConfig.showPrioritization,
      showActionPlan: savedConfig.showActionPlan,
      showScaleLegend: savedConfig.showScaleLegend,
      logoUrl: savedConfig.logoUrl ? `/api/admin/report-config/logo?organizationUserId=${organizationUserId}&t=${Date.now()}` : null,
      primaryColor: savedConfig.primaryColor ?? undefined,
      secondaryColor: savedConfig.secondaryColor ?? undefined,
      headerTitle: savedConfig.headerTitle ?? undefined,
      headerSubtitle: savedConfig.headerSubtitle,
    };

    return NextResponse.json({
      message: "Configuración del informe almacenada correctamente",
      config: withDefaultReportConfig(normalizedSavedConfig),
      updatedAt: savedConfig.updatedAt,
    });
  } catch (error) {
    console.error("Error saving report config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
