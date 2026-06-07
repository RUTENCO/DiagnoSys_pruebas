import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.user.role?.name !== "consultant") {
      return NextResponse.json({ error: "Consultant access required" }, { status: 403 });
    }

    const { reportId } = await params;
    const reportIdInt = Number.parseInt(reportId, 10);

    if (Number.isNaN(reportIdInt)) {
      return NextResponse.json({ error: "Valid report ID is required" }, { status: 400 });
    }

    const consultantId = Number.parseInt(session.user.id, 10);

    const accessibleReport = await prisma.report.findFirst({
      where: {
        id: reportIdInt,
        user: {
          organizationAudits: {
            some: {
              consultantId,
            },
          },
        },
      },
      select: { id: true },
    });

    if (!accessibleReport) {
      return NextResponse.json({ error: "Report not accessible" }, { status: 404 });
    }

    await prisma.report.delete({ where: { id: reportIdInt } });

    return NextResponse.json({ message: "Report removed successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}