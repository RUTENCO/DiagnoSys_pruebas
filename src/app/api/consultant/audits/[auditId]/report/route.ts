import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

interface CategoryStats {
    id: number;
    name: string;
    itemsCount: number;
    totalScore: number;
    avgScore: number;
    scores: number[];
}

interface ModuleStatsInternal {
    id: number;
    name: string;
    formsCount: number;
    completedForms: number;
    totalScore: number;
    totalItems: number;
    avgScore: number;
    categories: Record<number, CategoryStats>;
}

interface ModuleStats {
    id: number;
    name: string;
    formsCount: number;
    completedForms: number;
    totalScore: number;
    totalItems: number;
    avgScore: number;
    categories: CategoryStats[];
}

interface CategoryPerformance {
    moduleId: number;
    moduleName: string;
    categoryId: number;
    categoryName: string;
    avgScore: number;
    itemsCount: number;
}

/**
 * GET /api/consultant/audits/[auditId]/report
 * Generar reporte detallado de la auditoría con estadísticas y análisis
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ auditId: string }> }
) {
    const { auditId } = await context.params;
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        if (session.user.role?.name !== 'consultant') {
            return NextResponse.json(
                { error: "Consultant access required" },
                { status: 403 }
            );
        }

        const auditIdInt = parseInt(auditId);
        const consultantId = parseInt(session.user.id);
        
        if (isNaN(auditIdInt)) {
            return NextResponse.json(
                { error: "Invalid audit ID" },
                { status: 400 }
            );
        }

        // Obtener auditoría completa con todos los datos
        const audit = await prisma.audit.findFirst({
            where: {
                id: auditIdInt,
                consultantId: consultantId
            },
            include: {
                organizationUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        sector: true,
                        companySize: true
                    }
                },
                consultant: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                personalizedForms: {
                    include: {
                        baseForm: {
                            include: {
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
                                personalizedItems: true
                            }
                        }
                    }
                }
            }
        });

        if (!audit) {
            return NextResponse.json(
                { error: "Audit not found or access denied" },
                { status: 404 }
            );
        }

        // Calcular estadísticas generales
        const totalForms = audit.personalizedForms.length;
        const completedForms = audit.personalizedForms.filter(f => f.isCompleted).length;
        const totalCategories = audit.personalizedForms.reduce((sum, form) => sum + form.personalizedCategories.length, 0);
        const totalItems = audit.personalizedForms.reduce((sum, form) => 
            sum + form.personalizedCategories.reduce((catSum, cat) => catSum + cat.personalizedItems.length, 0), 0
        );

        // Estadísticas por módulo
        const moduleStats = audit.personalizedForms.reduce((modules, form) => {
            const moduleId = form.baseForm.module.id;
            const moduleName = form.baseForm.module.name;
            
            if (!modules[moduleId]) {
                modules[moduleId] = {
                    id: moduleId,
                    name: moduleName,
                    formsCount: 0,
                    completedForms: 0,
                    totalScore: 0,
                    totalItems: 0,
                    avgScore: 0,
                    categories: {} as Record<number, CategoryStats>
                };
            }
            
            modules[moduleId].formsCount++;
            if (form.isCompleted) modules[moduleId].completedForms++;
            
            form.personalizedCategories.forEach(cat => {
                const scoredItems = cat.personalizedItems.filter(item => item.score !== null);
                if (scoredItems.length > 0) {
                    modules[moduleId].totalItems += scoredItems.length;
                    modules[moduleId].totalScore += scoredItems.reduce((sum, item) => sum + (item.score || 0), 0);
                    
                    // Estadísticas por categoría
                    if (!modules[moduleId].categories[cat.id]) {
                        modules[moduleId].categories[cat.id] = {
                            id: cat.id,
                            name: cat.name,
                            itemsCount: scoredItems.length,
                            totalScore: scoredItems.reduce((sum, item) => sum + (item.score || 0), 0),
                            avgScore: scoredItems.reduce((sum, item) => sum + (item.score || 0), 0) / scoredItems.length,
                            scores: scoredItems.map(item => item.score || 0)
                        };
                    }
                }
            });
            
            return modules;
        }, {} as Record<number, ModuleStatsInternal>);

        // Calcular promedios por módulo y convertir categorías
        const processedModuleStats: Record<number, ModuleStats> = {};
        Object.values(moduleStats).forEach((module: ModuleStatsInternal) => {
            processedModuleStats[module.id] = {
                ...module,
                avgScore: module.totalItems > 0 ? module.totalScore / module.totalItems : 0,
                categories: Object.values(module.categories)
            };
        });

        // Análisis de puntuaciones generales
        const allScores = audit.personalizedForms.reduce((scores, form) => {
            form.personalizedCategories.forEach(cat => {
                cat.personalizedItems.forEach(item => {
                    if (item.score !== null) {
                        scores.push(item.score);
                    }
                });
            });
            return scores;
        }, [] as number[]);

        const overallAvg = allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
        
        // Distribución de puntajes
        const scoreDistribution = [1, 2, 3, 4, 5].map(score => ({
            score,
            count: allScores.filter(s => s === score).length,
            percentage: allScores.length > 0 ? Math.round((allScores.filter(s => s === score).length / allScores.length) * 100) : 0
        }));

        // Áreas de mejora (categorías con puntuación promedio más baja)
        const categoryPerformance = Object.values(processedModuleStats).reduce((categories, module: ModuleStats) => {
            module.categories.forEach((cat: CategoryStats) => {
                categories.push({
                    moduleId: module.id,
                    moduleName: module.name,
                    categoryId: cat.id,
                    categoryName: cat.name,
                    avgScore: cat.avgScore,
                    itemsCount: cat.itemsCount
                });
            });
            return categories;
        }, [] as CategoryPerformance[]);

        categoryPerformance.sort((a: CategoryPerformance, b: CategoryPerformance) => a.avgScore - b.avgScore);
        const improvementAreas = categoryPerformance.slice(0, 5); // Top 5 áreas con menor puntuación

        // Fortalezas (categorías con puntuación promedio más alta)
        const strengths = categoryPerformance.slice(-5).reverse(); // Top 5 áreas con mayor puntuación

        // Progreso temporal (si hay fechas de actualización)
        const progressTimeline = audit.personalizedForms
            .filter(form => form.completedAt)
            .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
            .map(form => ({
                formId: form.id,
                formName: form.name,
                moduleName: form.baseForm.module.name,
                completedAt: form.completedAt,
                isCompleted: form.isCompleted
            }));

        return NextResponse.json({
            audit: {
                id: audit.id,
                name: audit.name,
                description: audit.description,
                organizationUser: audit.organizationUser,
                consultant: audit.consultant,
                createdAt: audit.createdAt,
                updatedAt: audit.updatedAt
            },
            summary: {
                totalForms,
                completedForms,
                completionRate: totalForms > 0 ? Math.round((completedForms / totalForms) * 100) : 0,
                totalCategories,
                totalItems,
                overallAverage: Math.round(overallAvg * 100) / 100,
                totalScores: allScores.length
            },
            moduleStats: Object.values(processedModuleStats),
            analysis: {
                scoreDistribution,
                improvementAreas,
                strengths,
                overallMaturityLevel: overallAvg >= 4 ? 'High' : overallAvg >= 3 ? 'Medium' : overallAvg >= 2 ? 'Low' : 'Critical'
            },
            timeline: progressTimeline,
            generatedAt: new Date().toISOString(),
            message: "Audit report generated successfully"
        });

    } catch (error) {
        console.error("Error generating audit report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
