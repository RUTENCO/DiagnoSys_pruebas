import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { resolveScopedUserForDiagnostics, ScopedUserError } from "@/lib/consultant-scope";

interface BaseItemInput {
  name: string;
}

interface SaveRequestBody {
  highPriority?: BaseItemInput[];
  mediumPriority?: BaseItemInput[];
  lowPriority?: BaseItemInput[];
  mediumPriority2?: BaseItemInput[];
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

    const [lastHigh, lastMedium, lastLow, lastMedium2] = await Promise.all([
      prisma.highPriority.findFirst({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.mediumPriority.findFirst({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.lowPriority.findFirst({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.mediumPriority2.findFirst({
        where: { userId: scopedUser.targetUserId, reportId: reportIdInt },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const latestDate = [
      lastHigh?.createdAt,
      lastMedium?.createdAt,
      lastLow?.createdAt,
      lastMedium2?.createdAt,
    ]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    if (!latestDate) {
      return NextResponse.json({
        hasData: false,
        highPriority: [],
        mediumPriority: [],
        lowPriority: [],
        mediumPriority2: [],
      });
    }

    const [highPriority, mediumPriority, lowPriority, mediumPriority2] =
      await Promise.all([
        prisma.highPriority.findMany({
          where: { userId: scopedUser.targetUserId, reportId: reportIdInt, createdAt: latestDate },
          orderBy: { id: "asc" },
          select: { name: true },
        }),
        prisma.mediumPriority.findMany({
          where: { userId: scopedUser.targetUserId, reportId: reportIdInt, createdAt: latestDate },
          orderBy: { id: "asc" },
          select: { name: true },
        }),
        prisma.lowPriority.findMany({
          where: { userId: scopedUser.targetUserId, reportId: reportIdInt, createdAt: latestDate },
          orderBy: { id: "asc" },
          select: { name: true },
        }),
        prisma.mediumPriority2.findMany({
          where: { userId: scopedUser.targetUserId, reportId: reportIdInt, createdAt: latestDate },
          orderBy: { id: "asc" },
          select: { name: true },
        }),
      ]);

    return NextResponse.json({
      hasData: true,
      savedAt: latestDate,
      highPriority,
      mediumPriority,
      lowPriority,
      mediumPriority2,
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
    const {
      highPriority,
      mediumPriority,
      lowPriority,
      mediumPriority2,
    } = body;

    const cleanNames = (items?: BaseItemInput[]) =>
      (items ?? [])
        .map((item) => ({ name: item.name?.trim() ?? "" }))
        .filter((item) => item.name.length > 0);

    const cleanHighPriority = cleanNames(highPriority);
    const cleanMediumPriority = cleanNames(mediumPriority);
    const cleanLowPriority = cleanNames(lowPriority);
    const cleanMediumPriority2 = cleanNames(mediumPriority2);
    const saveTimestamp = new Date();

    await prisma.$transaction(async (tx) => {
      if (cleanHighPriority.length) {
        await tx.highPriority.createMany({
          data: cleanHighPriority.map((item) => ({
            name: item.name,
            userId: scopedUser.targetUserId,
            reportId: reportIdInt,
            createdAt: saveTimestamp,
          })),
        });
      }

      if (cleanMediumPriority.length) {
        await tx.mediumPriority.createMany({
          data: cleanMediumPriority.map((item) => ({
            name: item.name,
            userId: scopedUser.targetUserId,
            reportId: reportIdInt,
            createdAt: saveTimestamp,
          })),
        });
      }

      if (cleanLowPriority.length) {
        await tx.lowPriority.createMany({
          data: cleanLowPriority.map((item) => ({
            name: item.name,
            userId: scopedUser.targetUserId,
            reportId: reportIdInt,
            createdAt: saveTimestamp,
          })),
        });
      }

      if (cleanMediumPriority2.length) {
        await tx.mediumPriority2.createMany({
          data: cleanMediumPriority2.map((item) => ({
            name: item.name,
            userId: scopedUser.targetUserId,
            reportId: reportIdInt,
            createdAt: saveTimestamp,
          })),
        });
      }
    });

    return NextResponse.json({
      message: "Prioritization data saved successfully",
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
