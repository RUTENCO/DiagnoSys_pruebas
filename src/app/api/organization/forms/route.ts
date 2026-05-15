import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/forms
 * Ver formularios publicados disponibles para auto-evaluación
 */
export async function GET() {
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

        const organizationUserId = parseInt(session.user.id);
        
        // Obtener la organización del usuario
        const user = await prisma.user.findUnique({
            where: { id: organizationUserId }
        });

        if (!user) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            );
        }

        // Obtener formularios publicados
        const publishedForms = await prisma.form.findMany({
            where: {
                isPublished: true
            },
            include: {
                module: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                categories: {
                    include: {
                        items: true
                    }
                }
            },
            orderBy: [
                { module: { name: 'asc' } },
                { name: 'asc' }
            ]
        });

        // Verificar cuáles formularios ya tienen evaluaciones guardadas
        const existingPersonalizedForms = await prisma.personalizedForm.findMany({
            where: {
                userId: organizationUserId,
                auditId: null, // Auto-evaluaciones no tienen auditoría
                baseFormId: {
                    in: publishedForms.map(form => form.id)
                }
            },
            select: {
                id: true,
                baseFormId: true,
                isCompleted: true,
                completedAt: true,
                updatedAt: true
            }
        });

        // Mapear formularios con su estado de evaluación
        const formsWithStatus = publishedForms.map(form => {
            const existingEvaluation = existingPersonalizedForms.find(pf => pf.baseFormId === form.id);
            
            const totalItems = form.categories.reduce((sum, cat) => sum + cat.items.length, 0);
            
            return {
                id: form.id,
                name: form.name,
                description: form.description,
                module: form.module,
                totalCategories: form.categories.length,
                totalItems: totalItems,
                evaluation: existingEvaluation ? {
                    id: existingEvaluation.id,
                    isCompleted: existingEvaluation.isCompleted,
                    completedAt: existingEvaluation.completedAt,
                    lastUpdated: existingEvaluation.updatedAt,
                    status: existingEvaluation.isCompleted ? 'completed' : 'in_progress'
                } : null,
                categories: form.categories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    itemsCount: cat.items.length
                }))
            };
        });

        // Agrupar por módulo
        const moduleGroups = formsWithStatus.reduce((groups, form) => {
            const moduleId = form.module.id;
            if (!groups[moduleId]) {
                groups[moduleId] = {
                    module: form.module,
                    forms: [] as typeof form[]
                };
            }
            groups[moduleId].forms.push(form);
            return groups;
        }, {} as Record<number, { module: typeof formsWithStatus[0]['module']; forms: typeof formsWithStatus }>);

        // Estadísticas generales
        const totalForms = formsWithStatus.length;
        const formsWithEvaluations = formsWithStatus.filter(f => f.evaluation).length;
        const completedEvaluations = formsWithStatus.filter(f => f.evaluation?.isCompleted).length;
        const inProgressEvaluations = formsWithStatus.filter(f => f.evaluation && !f.evaluation.isCompleted).length;

        return NextResponse.json({
            organization: {
                id: user.id,
                description: null
            },
            modules: Object.values(moduleGroups),
            stats: {
                totalForms,
                formsWithEvaluations,
                completedEvaluations,
                inProgressEvaluations,
                notStarted: totalForms - formsWithEvaluations,
                completionRate: totalForms > 0 ? Math.round((completedEvaluations / totalForms) * 100) : 0
            },
            message: "Available forms retrieved successfully"
        });

    } catch (error) {
        console.error("Error fetching organization forms:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
