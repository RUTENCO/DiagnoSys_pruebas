import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/consultant/organizations/[orgId]/audits
 * Ver auditorías de una organización específica (ahora userId de User con role organization)
 * Solo consultant puede acceder
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ orgId: string }> }
) {
    const { orgId: userId } = await context.params;
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // Solo consultores pueden ver auditorías
        if (session.user.role?.name !== 'consultant') {
            return NextResponse.json(
                { error: "Consultant access required" },
                { status: 403 }
            );
        }

        const userIdInt = parseInt(userId);
        const consultantId = parseInt(session.user.id);
        
        if (isNaN(userIdInt)) {
            return NextResponse.json(
                { error: "Invalid user ID" },
                { status: 400 }
            );
        }

        // Verificar que el usuario existe y tiene role "organization"
        const organizationUser = await prisma.user.findUnique({
            where: { id: userIdInt },
            select: {
                id: true,
                name: true,
                email: true,
                role: {
                    select: { name: true }
                }
            }
        });

        if (!organizationUser || organizationUser.role.name !== "organization") {
            return NextResponse.json(
                { error: "Organization user not found" },
                { status: 404 }
            );
        }

        // Obtener auditorías de este consultor para este usuario organización
        const audits = await prisma.audit.findMany({
            where: {
                organizationUserId: userIdInt,
                consultantId: consultantId
            },
            include: {
                personalizedForms: {
                    include: {
                        baseForm: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        _count: {
                            select: {
                                personalizedCategories: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        personalizedForms: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Procesar datos
        const processedAudits = audits.map(audit => {
            const completedForms = audit.personalizedForms.filter(form => form.isCompleted).length;
            const totalForms = audit.personalizedForms.length;
            const completionRate = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

            return {
                id: audit.id,
                name: audit.name,
                description: audit.description,
                organizationUser: {
                    id: organizationUser.id,
                    name: organizationUser.name,
                    email: organizationUser.email
                },
                stats: {
                    totalForms: audit._count.personalizedForms,
                    completedForms: completedForms,
                    completionRate: Math.round(completionRate * 100) / 100
                },
                forms: audit.personalizedForms.map(form => ({
                    id: form.id,
                    name: form.name,
                    baseForm: form.baseForm,
                    isCompleted: form.isCompleted,
                    categoriesCount: form._count.personalizedCategories,
                    completedAt: form.completedAt,
                    updatedAt: form.updatedAt
                })),
                createdAt: audit.createdAt,
                updatedAt: audit.updatedAt
            };
        });

        return NextResponse.json({
            organizationUser: {
                id: organizationUser.id,
                name: organizationUser.name,
                email: organizationUser.email
            },
            audits: processedAudits,
            message: "Audits retrieved successfully"
        });

    } catch (error) {
        console.error("Error fetching organization audits:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
