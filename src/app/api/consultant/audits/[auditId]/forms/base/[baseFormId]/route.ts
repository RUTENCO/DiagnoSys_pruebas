import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

interface PersonalizedItemData {
    baseItemId?: number | null;
    name: string;
    score?: number | null;
    notes?: string | null;
}

interface PersonalizedCategoryData {
    baseCategoryId: number;
    name: string;
    items: PersonalizedItemData[];
}

interface PersonalizedFormData {
    name: string;
    description?: string | null;
    categories: PersonalizedCategoryData[];
}

/**
 * GET /api/consultant/audits/[auditId]/forms/[baseFormId]
 * Obtener formulario base para personalizar o formulario personalizado existente
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ auditId: string; baseFormId: string }> }
) {
    const { auditId, baseFormId } = await context.params;
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
        const baseFormIdInt = parseInt(baseFormId);
        const consultantId = parseInt(session.user.id);
        
        if (isNaN(auditIdInt) || isNaN(baseFormIdInt)) {
            return NextResponse.json(
                { error: "Invalid audit ID or form ID" },
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

        // Buscar si ya existe un formulario personalizado
        const existingPersonalizedForm = await prisma.personalizedForm.findFirst({
            where: {
                baseFormId: baseFormIdInt,
                userId: consultantId,
                auditId: auditIdInt
            },
            include: {
                personalizedCategories: {
                    include: {
                        personalizedItems: {
                            include: {
                                baseItem: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            },
                            orderBy: {
                                createdAt: 'asc'
                            }
                        },
                        baseCategory: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                baseForm: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        });

        if (existingPersonalizedForm) {
            // Retornar formulario personalizado existente
            const result = {
                id: existingPersonalizedForm.id,
                name: existingPersonalizedForm.name,
                baseForm: existingPersonalizedForm.baseForm,
                audit: {
                    id: audit.id,
                    name: audit.name,
                        organizationUser: audit.organizationUser
                },
                isCompleted: existingPersonalizedForm.isCompleted,
                // progress field removed from schema
                categories: existingPersonalizedForm.personalizedCategories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    baseCategoryId: cat.baseCategoryId,
                    baseCategory: cat.baseCategory,
                    items: cat.personalizedItems.map(item => ({
                        id: item.id,
                        name: item.name,
                        baseItemId: item.baseItemId,
                        baseItem: item.baseItem,
                        isCustom: item.isCustom,
                        score: item.score,
                        // notes field removed from schema
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt
                    }))
                })),
                createdAt: existingPersonalizedForm.createdAt,
                updatedAt: existingPersonalizedForm.updatedAt
            };

            return NextResponse.json({
                form: result,
                isPersonalized: true,
                message: "Personalized form retrieved successfully"
            });
        }

        // Si no existe, retornar formulario base para personalizar
        const baseForm = await prisma.form.findFirst({
            where: {
                id: baseFormIdInt,
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
                        items: {
                            orderBy: {
                                createdAt: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });

        if (!baseForm) {
            return NextResponse.json(
                { error: "Published form not found" },
                { status: 404 }
            );
        }

        const result = {
            id: baseForm.id,
            name: baseForm.name,
            description: baseForm.description,
            module: baseForm.module,
            audit: {
                id: audit.id,
                name: audit.name,
                    organizationUser: audit.organizationUser
            },
            categories: baseForm.categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                items: cat.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    score: null,
                    notes: null,
                    isSelected: false
                }))
            })),
            createdAt: baseForm.createdAt,
            updatedAt: baseForm.updatedAt
        };

        return NextResponse.json({
            form: result,
            isPersonalized: false,
            message: "Base form retrieved successfully"
        });

    } catch (error) {
        console.error("Error fetching form for personalization:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/consultant/audits/[auditId]/forms/[baseFormId]
 * Guardar formulario personalizado completo
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ auditId: string; baseFormId: string }> }
) {
    const { auditId, baseFormId } = await context.params;
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
        const baseFormIdInt = parseInt(baseFormId);
        const consultantId = parseInt(session.user.id);
        
        if (isNaN(auditIdInt) || isNaN(baseFormIdInt)) {
            return NextResponse.json(
                { error: "Invalid audit ID or form ID" },
                { status: 400 }
            );
        }

        const formData: PersonalizedFormData = await request.json();

        if (!formData.name || !formData.categories || !Array.isArray(formData.categories)) {
            return NextResponse.json(
                { error: "Invalid form data structure" },
                { status: 400 }
            );
        }

        // Verificar que la auditoría pertenece al consultor
        const audit = await prisma.audit.findFirst({
            where: {
                id: auditIdInt,
                consultantId: consultantId
            }
        });

        if (!audit) {
            return NextResponse.json(
                { error: "Audit not found or access denied" },
                { status: 404 }
            );
        }

        // Calcular completación
        const totalItems = formData.categories.reduce((sum, cat) => sum + cat.items.length, 0);
        const scoredItems = formData.categories.reduce((sum, cat) => 
            sum + cat.items.filter(item => item.score !== null && item.score !== undefined).length, 0
        );
        const isCompleted = scoredItems > 0; // Completed if any item has score

        // Usar transacción para guardar todo
        const result = await prisma.$transaction(async (tx) => {
            // Eliminar formulario personalizado existente si existe
            const existing = await tx.personalizedForm.findFirst({
                where: {
                    baseFormId: baseFormIdInt,
                    userId: consultantId,
                    auditId: auditIdInt
                }
            });

            if (existing) {
                await tx.personalizedForm.delete({
                    where: { id: existing.id }
                });
            }

            // Crear nuevo formulario personalizado
            const personalizedForm = await tx.personalizedForm.create({
                data: {
                    name: formData.name,
                    baseFormId: baseFormIdInt,
                    userId: consultantId,
                    auditId: auditIdInt,
                    isCompleted,
                    completedAt: isCompleted ? new Date() : null,
                    personalizedCategories: {
                        create: formData.categories.map(catData => ({
                            name: catData.name,
                            baseCategoryId: catData.baseCategoryId,
                            baseCategory: {
                                connect: { id: catData.baseCategoryId }
                            },
                            personalizedItems: {
                                create: catData.items.map(itemData => ({
                                    name: itemData.name,
                                    baseItemId: itemData.baseItemId || null,
                                    isCustom: !itemData.baseItemId,
                                    score: itemData.score || 1 // score is required, default to 1 if null
                                }))
                            }
                        }))
                    }
                }
            });

            return personalizedForm;
        });

        return NextResponse.json({
            form: {
                id: result.id,
                name: result.name,
                baseFormId: result.baseFormId,
                isCompleted: result.isCompleted,
                stats: {
                    categoriesCreated: formData.categories.length,
                    totalItemsSubmitted: totalItems,
                    scoredItems: scoredItems
                },
                completedAt: result.completedAt,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt
            },
            message: "Personalized form saved successfully"
        }, { status: 201 });

    } catch (error) {
        console.error("Error saving personalized form:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
