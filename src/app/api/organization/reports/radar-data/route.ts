import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

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

        if (session.user.role?.name !== 'organization') {
            return NextResponse.json(
                { error: "Organization access required" },
                { status: 403 }
            );
        }

        const userId = parseInt(session.user.id);
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

        return NextResponse.json({
            zoomInForms: zoomInData,
            zoomOutForms: zoomOutData,
            message: "Radar data retrieved successfully"
        });

    } catch (error) {
        console.error("🚨 Error fetching radar data:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
