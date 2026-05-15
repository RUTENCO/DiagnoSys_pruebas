import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/consultant/audits/[auditId]/saved-forms
 * Ver formularios guardados de una auditoría específica
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

        // Verificar que la auditoría pertenece al consultor
        const audit = await prisma.audit.findFirst({
            where: {
                id: auditIdInt,
                consultantId: consultantId
            },
            include: {
                organizationUser: {
                    select: {
                        id: true
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

        // Obtener formularios personalizados de esta auditoría
        const personalizedForms = await prisma.personalizedForm.findMany({
            where: {
                auditId: auditIdInt,
                userId: consultantId
            },
            include: {
                baseForm: {
                    select: {
                        id: true,
                        name: true,
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
                            // All personalizedItems have scores now (score is required)
                        }
                    }
                },
                _count: {
                    select: {
                        personalizedCategories: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Procesar datos - solo mostrar categorías con items calificados
        const processedForms = personalizedForms.map(form => {
            const categoriesWithScores = form.personalizedCategories;
            const totalScoredItems = categoriesWithScores.reduce((sum, cat) => sum + cat.personalizedItems.length, 0);

            return {
                id: form.id,
                name: form.name,
                baseForm: form.baseForm,
                isCompleted: form.isCompleted,
                stats: {
                    categoriesWithScores: categoriesWithScores.length,
                    totalScoredItems: totalScoredItems,
                    avgScore: categoriesWithScores.length > 0 
                        ? categoriesWithScores.reduce((sum, cat) => {
                            const catAvg = cat.personalizedItems.reduce((itemSum, item) => itemSum + item.score, 0) / cat.personalizedItems.length;
                            return sum + (isNaN(catAvg) ? 0 : catAvg);
                          }, 0) / categoriesWithScores.length
                        : 0
                },
                categories: categoriesWithScores.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    itemsCount: cat.personalizedItems.length,
                    avgScore: cat.personalizedItems.length > 0
                        ? cat.personalizedItems.reduce((sum, item) => sum + item.score, 0) / cat.personalizedItems.length
                        : 0
                })),
                completedAt: form.completedAt,
                createdAt: form.createdAt,
                updatedAt: form.updatedAt
            };
        });

        return NextResponse.json({
            audit: {
                id: audit.id,
                name: audit.name,
                organizationUser: audit.organizationUser
            },
            forms: processedForms,
            stats: {
                totalForms: processedForms.length,
                completedForms: processedForms.filter(f => f.isCompleted).length,
                avgScore: processedForms.length > 0 
                    ? processedForms.reduce((sum, form) => sum + form.stats.avgScore, 0) / processedForms.length
                    : 0
            },
            message: "Saved forms retrieved successfully"
        });

    } catch (error) {
        console.error("Error fetching saved forms:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
