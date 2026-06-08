import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

type ReportSummary = {
  id: number;
  name: string;
  version: number;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalForms: number;
    completedForms: number;
    completionRate: number;
  };
};

type OrganizationReportsSummary = {
  id: number;
  name: string;
  userName: string;
  email: string;
  sector: string | null;
  companySize: string | null;
  stats: {
    reportsCount: number;
  };
  reports: ReportSummary[];
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.user.role?.name !== "consultant") {
      return NextResponse.json({ error: "Consultant access required" }, { status: 403 });
    }

    const consultantId = Number.parseInt(session.user.id, 10);

    const [zoomInTotalExpected, zoomOutTotalExpected] = await Promise.all([
      prisma.form.count({
        where: {
          module: {
            name: {
              contains: "zoom in",
              mode: "insensitive",
            },
          },
        },
      }),
      prisma.form.count({
        where: {
          module: {
            name: {
              contains: "zoom out",
              mode: "insensitive",
            },
          },
        },
      }),
    ]);

    const consultantOrganizations = await prisma.consultantOrganization.findMany({
      where: {
        consultantId,
        linkedUserId: { not: null },
      },
      include: {
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            sector: true,
            companySize: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const processedOrganizations: OrganizationReportsSummary[] = await Promise.all(
      consultantOrganizations
        .filter((organization) => organization.linkedUser)
        .map(async (organization) => {
        const organizationUser = organization.linkedUser!;
        const organizationUserId = organizationUser.id;

        const reports = await prisma.report.findMany({
          where: {
            userId: organizationUserId,
          },
          include: {
            personalizedForms: {
              select: {
                id: true,
                isCompleted: true,
                baseForm: {
                  select: {
                    module: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        const reportsSummary = reports.map((report) => {
          const totalForms = zoomInTotalExpected + zoomOutTotalExpected;
          const completedForms = report.personalizedForms.filter((form) => form.isCompleted).length;
          const completionRate = totalForms > 0 ? Math.round((completedForms / totalForms) * 100) : 0;

          return {
            id: report.id,
            name: report.name,
            version: report.version,
            isCompleted: report.isCompleted,
            completedAt: report.completedAt ? report.completedAt.toISOString() : null,
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString(),
            stats: {
              totalForms,
              completedForms,
              completionRate,
            },
          };
        });

        return {
          id: organizationUser.id,
          name: organization.name,
          userName: organization.name,
          email: organization.email,
          sector: organization.sector,
          companySize: organization.companySize,
          stats: {
            reportsCount: reportsSummary.length,
          },
          reports: reportsSummary,
        };
      })
    );

    return NextResponse.json({
      organizations: processedOrganizations,
      message: "Consultant organization reports retrieved successfully",
    });
  } catch (error) {
    console.error("🚨 Error fetching consultant organization reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}