import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { resolveScopedUserForDiagnostics, ScopedUserError } from "@/lib/consultant-scope";
import { withDefaultReportConfig } from "@/lib/report-config";

function getSecondRange(date: Date) {
    const start = new Date(date);
    start.setMilliseconds(0);
    const end = new Date(start);
    end.setSeconds(end.getSeconds() + 1);
    return { start, end };
}

/**
 * GET /api/organization/reports/radar-data
 * Get the latest personalized forms for radar charts
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const organizationId = request.nextUrl.searchParams.get("organizationId");
        const isOrganization = session.user.role?.name === 'organization';
        const isConsultant = session.user.role?.name === 'consultant';

        if (!isOrganization && !isConsultant) {
            return NextResponse.json(
                { error: "Organization access required" },
                { status: 403 }
            );
        }

        let userId = parseInt(session.user.id, 10);
        if (isConsultant) {
            const scopedUser = await resolveScopedUserForDiagnostics(session.user.id, organizationId);
            userId = scopedUser.targetUserId;
        }
        const reportIdParam = request.nextUrl.searchParams.get("reportId");
        const reportIdInt = reportIdParam ? parseInt(reportIdParam, 10) : null;

        if (reportIdParam && (reportIdInt === null || isNaN(reportIdInt))) {
            return NextResponse.json(
                { error: "Invalid report ID" },
                { status: 400 }
            );
        }

        if (reportIdInt !== null) {
            const report = await prisma.report.findFirst({
                where: {
                    id: reportIdInt,
                    userId,
                },
                select: { id: true },
            });

            if (!report) {
                return NextResponse.json(
                    { error: "Report not found" },
                    { status: 404 }
                );
            }
        }
        
        console.log("🔍 Fetching radar data for userId:", userId);

        // Get all personalized forms for this organization user
        // We'll get the latest one for each base form
        const personalizedForms = await prisma.personalizedForm.findMany({
            where: {
                userId: userId,
                auditId: null,
                reportId: reportIdInt,
                // Remove isCompleted restriction to see all forms
            },
            include: {
                baseForm: {
                    select: {
                        id: true,
                        name: true,
                        tag: true,
                        module: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                personalizedCategories: {
                    include: {
                        personalizedItems: {
                            select: {
                                id: true,
                                name: true,
                                score: true,
                                isCustom: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        
        console.log("📋 Found personalized forms:", personalizedForms.length);
        console.log("📊 Forms data:", personalizedForms.map(f => ({ 
            id: f.id, 
            name: f.name, 
            baseFormId: f.baseFormId,
            module: f.baseForm.module.name,
            categoriesCount: f.personalizedCategories.length,
            isCompleted: f.isCompleted
        })));

        // Group by module and baseFormId, take the latest one for each
        const latestFormsByModule = new Map();
        
        personalizedForms.forEach(form => {
            const moduleId = form.baseForm.module.id;
            const baseFormId = form.baseFormId;
            const key = `${moduleId}-${baseFormId}`;
            
            if (!latestFormsByModule.has(key) || 
                new Date(form.updatedAt) > new Date(latestFormsByModule.get(key).updatedAt)) {
                latestFormsByModule.set(key, form);
            }
        });

        const latestForms = Array.from(latestFormsByModule.values());
        console.log("🎯 Latest forms selected:", latestForms.length);

        // Process forms for radar charts
        type RadarItem = { id: number; name: string; score: number; isCustom: boolean };
        type RadarCategory = { name: string; personalizedItems: RadarItem[] };
        type RadarForm = {
            id: number;
            name: string;
            baseForm: { module: { name: string } };
            personalizedCategories: RadarCategory[];
            isCompleted: boolean;
            completedAt: Date | null;
        };

        const processFormsForRadar = (forms: RadarForm[]) => {
            return forms.map(form => {
                console.log(`📈 Processing form: ${form.name} with ${form.personalizedCategories.length} categories`);
                
                // Calculate average score per category
                const categoryData = form.personalizedCategories.map((category: RadarCategory) => {
                    const items = category.personalizedItems;
                    const totalScore = items.reduce((sum: number, item: RadarItem) => sum + item.score, 0);
                    const avgScore = items.length > 0 ? totalScore / items.length : 0;
                    
                    console.log(`   📊 Category: ${category.name}, Items: ${items.length}, Total Score: ${totalScore}, Avg Score: ${avgScore}`);
                    
                    return {
                        name: category.name,
                        score: Math.round(avgScore * 100) / 100, // Round to 2 decimals
                        maxScore: 5,
                        itemCount: items.length,
                        totalScore: totalScore
                    };
                });

                // Calculate overall form stats
                const totalItems = form.personalizedCategories.reduce(
                    (sum: number, cat: RadarCategory) => sum + cat.personalizedItems.length, 0
                );
                const totalScore = form.personalizedCategories.reduce(
                    (sum: number, cat: RadarCategory) => sum + cat.personalizedItems.reduce((catSum: number, item: RadarItem) => catSum + item.score, 0), 0
                );
                const avgScore = totalItems > 0 ? totalScore / totalItems : 0;

                const result = {
                    id: form.id,
                    name: form.name,
                    module: form.baseForm.module.name,
                    isCompleted: form.isCompleted,
                    completedAt: form.completedAt,
                    categoryData: categoryData,
                    stats: {
                        totalItems: totalItems,
                        totalScore: totalScore,
                        avgScore: Math.round(avgScore * 100) / 100,
                        maxPossibleScore: totalItems * 5,
                        completionPercentage: totalItems > 0 ? Math.round((avgScore / 5) * 100) : 0
                    }
                };
                
                console.log(`   ✅ Processed form: ${result.name}, Categories: ${result.categoryData.length}, Avg Score: ${result.stats.avgScore}`);
                return result;
            });
        };

        // Separate forms by zoom type
        console.log('🔍 Separating forms by zoom type...');
        const zoomInForms = latestForms.filter(form => {
            const isZoomIn = form.baseForm.module.name.toLowerCase().includes('zoom in');
            console.log(`   📋 Form "${form.name}" (Module: ${form.baseForm.module.name}, Tag: ${form.baseForm.tag}) -> ZoomIn: ${isZoomIn}`);
            return isZoomIn;
        });
        
        const zoomOutForms = latestForms.filter(form => {
            const isZoomOut = form.baseForm.module.name.toLowerCase().includes('zoom out');
            console.log(`   📋 Form "${form.name}" (Module: ${form.baseForm.module.name}, Tag: ${form.baseForm.tag}) -> ZoomOut: ${isZoomOut}`);
            return isZoomOut;
        });

        console.log(`📊 ZoomIn forms found: ${zoomInForms.length}`);
        console.log(`📊 ZoomOut forms found: ${zoomOutForms.length}`);

        const zoomInData = processFormsForRadar(zoomInForms);
        const zoomOutData = processFormsForRadar(zoomOutForms);

        const [lastOpportunity, lastNeed, lastProblem] = await Promise.all([
            prisma.opportunity.findFirst({
                where: { userId, reportId: reportIdInt },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),
            prisma.need.findFirst({
                where: { userId, reportId: reportIdInt },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),
            prisma.problem.findFirst({
                where: { userId, reportId: reportIdInt },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),
        ]);

        const latestCategorizationDate = [
            lastOpportunity?.createdAt,
            lastNeed?.createdAt,
            lastProblem?.createdAt,
        ]
            .filter(Boolean)
            .sort((a, b) => b!.getTime() - a!.getTime())[0];

        let categorizationSummary = {
            hasData: false,
            savedAt: null as Date | null,
            opportunities: [] as { name: string }[],
            needs: [] as { name: string }[],
            problems: [] as { name: string }[],
            totalItems: 0,
        };

        if (latestCategorizationDate) {
            const { start, end } = getSecondRange(latestCategorizationDate);
            const [opportunities, needs, problems] = await Promise.all([
                prisma.opportunity.findMany({
                    where: { userId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
                    orderBy: { id: "asc" },
                    select: { name: true },
                }),
                prisma.need.findMany({
                    where: { userId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
                    orderBy: { id: "asc" },
                    select: { name: true },
                }),
                prisma.problem.findMany({
                    where: { userId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
                    orderBy: { id: "asc" },
                    select: { name: true },
                }),
            ]);

            categorizationSummary = {
                hasData: true,
                savedAt: latestCategorizationDate,
                opportunities,
                needs,
                problems,
                totalItems: opportunities.length + needs.length + problems.length,
            };
        }

        const [lastHigh, lastMedium, lastLow, lastMedium2] = await Promise.all([
            prisma.highPriority.findFirst({
                where: { userId, reportId: reportIdInt },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),
            prisma.mediumPriority.findFirst({
                where: { userId, reportId: reportIdInt },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),
            prisma.lowPriority.findFirst({
                where: { userId, reportId: reportIdInt },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),
            prisma.mediumPriority2.findFirst({
                where: { userId, reportId: reportIdInt },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),
        ]);

        const latestPrioritizationDate = [
            lastHigh?.createdAt,
            lastMedium?.createdAt,
            lastLow?.createdAt,
            lastMedium2?.createdAt,
        ]
            .filter(Boolean)
            .sort((a, b) => b!.getTime() - a!.getTime())[0];

        let prioritizationSummary = {
            hasData: false,
            savedAt: null as Date | null,
            highPriority: [] as { name: string }[],
            mediumPriority: [] as { name: string }[],
            lowPriority: [] as { name: string }[],
            mediumPriority2: [] as { name: string }[],
            totalItems: 0,
        };

        if (latestPrioritizationDate) {
            const { start, end } = getSecondRange(latestPrioritizationDate);
            const [highPriority, mediumPriority, lowPriority, mediumPriority2] = await Promise.all([
                prisma.highPriority.findMany({
                    where: { userId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
                    orderBy: { id: "asc" },
                    select: { name: true },
                }),
                prisma.mediumPriority.findMany({
                    where: { userId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
                    orderBy: { id: "asc" },
                    select: { name: true },
                }),
                prisma.lowPriority.findMany({
                    where: { userId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
                    orderBy: { id: "asc" },
                    select: { name: true },
                }),
                prisma.mediumPriority2.findMany({
                    where: { userId, reportId: reportIdInt, createdAt: { gte: start, lt: end } },
                    orderBy: { id: "asc" },
                    select: { name: true },
                }),
            ]);

            prioritizationSummary = {
                hasData: true,
                savedAt: latestPrioritizationDate,
                highPriority,
                mediumPriority,
                lowPriority,
                mediumPriority2,
                totalItems:
                    highPriority.length +
                    mediumPriority.length +
                    lowPriority.length +
                    mediumPriority2.length,
            };
        }

        const actionPlanSummary = {
            hasData: prioritizationSummary.totalItems > 0,
            items: [
                ...prioritizationSummary.highPriority.map((item, index) => ({
                    order: index + 1,
                    name: item.name,
                    level: "Alta prioridad",
                })),
                ...prioritizationSummary.mediumPriority.map((item, index) => ({
                    order: prioritizationSummary.highPriority.length + index + 1,
                    name: item.name,
                    level: "Prioridad media (alto impacto)",
                })),
                ...prioritizationSummary.mediumPriority2.map((item, index) => ({
                    order:
                        prioritizationSummary.highPriority.length +
                        prioritizationSummary.mediumPriority.length +
                        index +
                        1,
                    name: item.name,
                    level: "Prioridad media (alta urgencia)",
                })),
                ...prioritizationSummary.lowPriority.map((item, index) => ({
                    order:
                        prioritizationSummary.highPriority.length +
                        prioritizationSummary.mediumPriority.length +
                        prioritizationSummary.mediumPriority2.length +
                        index +
                        1,
                    name: item.name,
                    level: "Baja prioridad",
                })),
            ],
        };

        const reportDisplayConfigRaw = await prisma.reportDisplayConfig.findUnique({
                where: { organizationUserId: userId },
                select: {
                    showExecutiveSummary: true,
                    showRadar: true,
                    showCategorization: true,
                    showPrioritization: true,
                    showActionPlan: true,
                    showScaleLegend: true,
                    logoUrl: true,
                    logoData: true,
                    logoContentType: true,
                    primaryColor: true,
                    secondaryColor: true,
                    headerTitle: true,
                    headerSubtitle: true,
                },
            });

        const embeddedLogoUrl = reportDisplayConfigRaw?.logoData
            ? `data:${reportDisplayConfigRaw.logoContentType || "image/png"};base64,${Buffer.from(reportDisplayConfigRaw.logoData as Uint8Array).toString("base64")}`
            : null;

        const reportDisplayConfig = withDefaultReportConfig(
            reportDisplayConfigRaw
                ? {
                      showExecutiveSummary: reportDisplayConfigRaw.showExecutiveSummary,
                      showRadar: reportDisplayConfigRaw.showRadar,
                      showCategorization: reportDisplayConfigRaw.showCategorization,
                      showPrioritization: reportDisplayConfigRaw.showPrioritization,
                      showActionPlan: reportDisplayConfigRaw.showActionPlan,
                      showScaleLegend: reportDisplayConfigRaw.showScaleLegend,
                      logoUrl: embeddedLogoUrl ?? reportDisplayConfigRaw.logoUrl,
                      primaryColor: reportDisplayConfigRaw.primaryColor ?? undefined,
                      secondaryColor: reportDisplayConfigRaw.secondaryColor ?? undefined,
                      headerTitle: reportDisplayConfigRaw.headerTitle ?? undefined,
                      headerSubtitle: reportDisplayConfigRaw.headerSubtitle,
                  }
                : null
        );

        return NextResponse.json({
            zoomInForms: zoomInData,
            zoomOutForms: zoomOutData,
            categorizationSummary,
            prioritizationSummary,
            actionPlanSummary,
            reportDisplayConfig,
            message: "Radar data retrieved successfully"
        });

    } catch (error) {
        if (error instanceof ScopedUserError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("🚨 Error fetching radar data:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
