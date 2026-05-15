import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { resolveScopedUserForDiagnostics, ScopedUserError } from "@/lib/consultant-scope";

/**
 * GET /api/modules/categorization/drag-items
 * Retorna los items evaluados de formularios Zoom Out para usar en categorizacion/priorizacion.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const organizationId = request.nextUrl.searchParams.get("organizationId");
    const reportIdParam = request.nextUrl.searchParams.get("reportId");
    const reportIdInt = reportIdParam ? parseInt(reportIdParam, 10) : null;

    const scopedUser = await resolveScopedUserForDiagnostics(session.user.id, organizationId);
    const targetUserId = scopedUser.targetUserId;

    if (reportIdParam && (reportIdInt === null || Number.isNaN(reportIdInt))) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    if (reportIdInt !== null) {
      const report = await prisma.report.findFirst({
        where: {
          id: reportIdInt,
          userId: targetUserId,
        },
        select: { id: true },
      });

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
    }

    const personalizedForms = await prisma.personalizedForm.findMany({
      where: {
        userId: targetUserId,
        auditId: null,
        reportId: reportIdInt,
        baseForm: {
          module: {
            name: {
              contains: "zoom out",
              mode: "insensitive",
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        baseFormId: true,
        updatedAt: true,
        personalizedCategories: {
          select: {
            id: true,
            name: true,
            personalizedItems: {
              select: {
                id: true,
                name: true,
                score: true,
                isCustom: true,
              },
              orderBy: { id: "asc" },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const latestFormsByBaseForm = new Map<number, (typeof personalizedForms)[number]>();
    for (const form of personalizedForms) {
      if (!latestFormsByBaseForm.has(form.baseFormId)) {
        latestFormsByBaseForm.set(form.baseFormId, form);
      }
    }

    const forms = Array.from(latestFormsByBaseForm.values()).map((form) => ({
      id: form.id,
      name: form.name,
      categories: form.personalizedCategories.map((category) => ({
        id: category.id,
        name: category.name,
        items: category.personalizedItems.map((item) => ({
          id: item.id,
          name: item.name,
          score: item.score,
          isCustom: item.isCustom,
        })),
      })),
    }));

    return NextResponse.json({
      forms,
      message: "Drag items retrieved successfully",
    });
  } catch (error) {
    if (error instanceof ScopedUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error fetching categorization drag items:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
