import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { resolveScopedUserForDiagnostics, ScopedUserError } from "@/lib/consultant-scope";

interface BaseItemInput {
  name: string;
}

interface SaveRequestBody {
  opportunities?: BaseItemInput[];
  needs?: BaseItemInput[];
  problems?: BaseItemInput[];
}

function getSecondRange(date: Date) {
  const start = new Date(date);
  start.setMilliseconds(0);
  const end = new Date(start);
  end.setSeconds(end.getSeconds() + 1);
  return { start, end };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = new URL(req.url).searchParams.get("organizationId");
    const reportIdParam = new URL(req.url).searchParams.get("reportId");
    const reportIdInt = reportIdParam ? parseInt(reportIdParam, 10) : null;
    const scopedUser = await resolveScopedUserForDiagnostics(session.user.id, organizationId);

    if (reportIdParam && (reportIdInt === null || isNaN(reportIdInt))) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    if (reportIdInt !== null) {
      const report = await prisma.report.findFirst({
        where: {
          id: reportIdInt,
          userId: scopedUser.targetUserId,
        },
        select: { id: true },
      });

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
    }

    const [lastOpportunity, lastNeed, lastProblem] = await Promise.all([
      prisma.opportunity.findFirst({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.need.findFirst({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.problem.findFirst({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const latestDate = [lastOpportunity?.createdAt, lastNeed?.createdAt, lastProblem?.createdAt]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    if (!latestDate) {
      return NextResponse.json({
        hasData: false,
        opportunities: [],
        needs: [],
        problems: [],
      });
    }

    const { start, end } = getSecondRange(latestDate);

    const [opportunities, needs, problems] = await Promise.all([
      prisma.opportunity.findMany({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
        orderBy: { id: "asc" },
        select: { name: true },
      }),
      prisma.need.findMany({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
        orderBy: { id: "asc" },
        select: { name: true },
      }),
      prisma.problem.findMany({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
        orderBy: { id: "asc" },
        select: { name: true },
      }),
    ]);

    return NextResponse.json({
      hasData: true,
      savedAt: latestDate,
      opportunities,
      needs,
      problems,
    });
  } catch (error) {
    if (error instanceof ScopedUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = new URL(req.url).searchParams.get("organizationId");
    const reportIdParam = new URL(req.url).searchParams.get("reportId");
    const reportIdInt = reportIdParam ? parseInt(reportIdParam, 10) : null;
    const scopedUser = await resolveScopedUserForDiagnostics(session.user.id, organizationId);

    if (reportIdParam && (reportIdInt === null || isNaN(reportIdInt))) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    if (reportIdInt !== null) {
      const report = await prisma.report.findFirst({
        where: {
          id: reportIdInt,
          userId: scopedUser.targetUserId,
        },
        select: { id: true },
      });

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
    }

    const body: SaveRequestBody = await req.json();
    const { opportunities, needs, problems } = body;

    const cleanNames = (items?: BaseItemInput[]) =>
      (items ?? [])
        .map((item) => ({ name: item.name?.trim() ?? "" }))
        .filter((item) => item.name.length > 0);

    const cleanOpportunities = cleanNames(opportunities);
    const cleanNeeds = cleanNames(needs);
    const cleanProblems = cleanNames(problems);
    const saveTimestamp = new Date();

    await prisma.$transaction(async (tx) => {
      if (cleanOpportunities.length) {
        await tx.opportunity.createMany({
          data: cleanOpportunities.map((o) => ({
            name: o.name,
            userId: scopedUser.targetUserId,
            reportId: reportIdInt,
            createdAt: saveTimestamp,
          })),
        });
      }

      if (cleanNeeds.length) {
        await tx.need.createMany({
          data: cleanNeeds.map((n) => ({
            name: n.name,
            userId: scopedUser.targetUserId,
            reportId: reportIdInt,
            createdAt: saveTimestamp,
          })),
        });
      }

      if (cleanProblems.length) {
        await tx.problem.createMany({
          data: cleanProblems.map((p) => ({
            name: p.name,
            userId: scopedUser.targetUserId,
            reportId: reportIdInt,
            createdAt: saveTimestamp,
          })),
        });
      }
    });

    return NextResponse.json({
      message: "Categorization data saved successfully",
      updated: false,
      savedAt: saveTimestamp,
    });
  } catch (error) {
    if (error instanceof ScopedUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
