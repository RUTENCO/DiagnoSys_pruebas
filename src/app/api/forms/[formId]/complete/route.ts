import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { resolveScopedUserForDiagnostics, ScopedUserError } from "@/lib/consultant-scope";

interface SelectedItem {
    itemId: number;
    score: number;
    isNew: boolean;
    name: string;
}

interface SelectedCategory {
    categoryId: number;
    name: string;
    selectedItems: SelectedItem[];
}

/**
 * POST /api/forms/[formId]/complete
 * Guarda las respuestas como un formulario personalizado del usuario
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ formId: string }> }
) {
    const { formId } = await context.params;
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const formIdInt = parseInt(formId);
        const organizationId = request.nextUrl.searchParams.get("organizationId");
        const reportIdParam = request.nextUrl.searchParams.get("reportId");
        const scopedUser = await resolveScopedUserForDiagnostics(session.user.id, organizationId);
        const targetUserId = scopedUser.targetUserId;
        const reportIdInt = reportIdParam ? parseInt(reportIdParam, 10) : null;
        
        if (isNaN(formIdInt) || isNaN(targetUserId)) {
            return NextResponse.json(
                { error: "Invalid form ID or user ID" },
                { status: 400 }
            );
        }

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
                    userId: targetUserId,
                },
                select: { id: true },
            });

            if (!report) {
                return NextResponse.json(
                    { error: "Report not found for this user" },
                    { status: 404 }
                );
            }
        }

        const body = await request.json();
        const { selectedCategories }: { selectedCategories: SelectedCategory[] } = body;

        // Validar estructura de datos
        if (!selectedCategories || !Array.isArray(selectedCategories) || selectedCategories.length === 0) {
            return NextResponse.json(
                { error: "No categories with selected items" },
                { status: 400 }
            );
        }

        // Validar que cada categoría tenga al menos un item seleccionado con score
        for (const category of selectedCategories) {
            if (!category.name || typeof category.name !== 'string' || category.name.trim() === '') {
                return NextResponse.json(
                    { error: `Category ${category.categoryId || 'unknown'} is missing a valid name` },
                    { status: 400 }
                );
            }
            
            if (!category.selectedItems || category.selectedItems.length === 0) {
                return NextResponse.json(
                    { error: "Each category must have at least one item selected" },
                    { status: 400 }
                );
            }
            
            for (const item of category.selectedItems) {
                if (!item.score || item.score < 1 || item.score > 5) {
                    return NextResponse.json(
                        { error: "All selected items must have a valid score (1-5)" },
                        { status: 400 }
                    );
                }
            }
        }

        // Obtener formulario base para obtener su nombre
        const baseForm = await prisma.form.findUnique({
            where: { id: formIdInt },
            select: { name: true }
        });

        if (!baseForm) {
            return NextResponse.json(
                { error: "Form not found" },
                { status: 404 }
            );
        }

        console.log(`Creating PersonalizedForm for user ${targetUserId} on form ${formId}:`, {
            categoriesCount: selectedCategories.length,
            totalItems: selectedCategories.reduce((sum, cat) => sum + cat.selectedItems.length, 0)
        });

        // Transacción para crear el formulario personalizado (con timeout extendido)
        const result = await prisma.$transaction(async (tx) => {
            // 1. Buscar si ya existe un PersonalizedForm para este usuario y formulario base
            let personalizedForm = await tx.personalizedForm.findFirst({
                where: {
                    userId: targetUserId,
                    baseFormId: formIdInt,
                    auditId: null,
                    reportId: reportIdInt,
                }
            });

            if (personalizedForm) {
                // Actualizar existente
                personalizedForm = await tx.personalizedForm.update({
                    where: { id: personalizedForm.id },
                    data: {
                        name: `${baseForm.name} - ${new Date().toLocaleDateString()}`,
                        isCompleted: true,
                        completedAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            } else {
                // Crear nuevo
                personalizedForm = await tx.personalizedForm.create({
                    data: {
                        name: `${baseForm.name} - ${new Date().toLocaleDateString()}`,
                        baseFormId: formIdInt,
                        userId: targetUserId,
                        reportId: reportIdInt,
                        isCompleted: true,
                        completedAt: new Date()
                    }
                });
            }

            // 2. Eliminar categorías personalizadas anteriores (para reemplazar completamente)
            await tx.personalizedCategory.deleteMany({
                where: {
                    personalizedFormId: personalizedForm.id
                }
            });

            let totalItemsProcessed = 0;
            let newItemsCreated = 0;

            // 3. Crear categorías personalizadas con sus items (optimizado con createMany)
            for (const category of selectedCategories) {
                // Crear PersonalizedCategory
                const personalizedCategory = await tx.personalizedCategory.create({
                    data: {
                        name: category.name || `Category ${category.categoryId}`,
                        baseCategoryId: category.categoryId,
                        personalizedFormId: personalizedForm.id
                    }
                });

                // 4. Preparar datos de items para crear en lote
                const itemsToCreate = category.selectedItems.map((item: SelectedItem) => {
                    if (item.isNew) {
                        newItemsCreated++;
                        return {
                            name: item.name.trim(),
                            isCustom: true,
                            baseItemId: null,
                            personalizedCategoryId: personalizedCategory.id,
                            score: item.score
                        };
                    } else {
                        return {
                            name: item.name.trim(),
                            isCustom: false,
                            baseItemId: item.itemId,
                            personalizedCategoryId: personalizedCategory.id,
                            score: item.score
                        };
                    }
                });

                // Crear todos los items de la categoría en una sola operación
                await tx.personalizedItem.createMany({
                    data: itemsToCreate
                });

                totalItemsProcessed += category.selectedItems.length;
            }

            return {
                personalizedFormId: personalizedForm.id,
                totalItemsProcessed,
                newItemsCreated,
                categoriesProcessed: selectedCategories.length
            };
        }, {
            timeout: 15000 // Timeout de 15 segundos en lugar de 5
        });

        return NextResponse.json({
            success: true,
            message: "✅ Formulario personalizado guardado correctamente",
            data: {
                baseFormId: formIdInt,
                userId: targetUserId,
                personalizedFormId: result.personalizedFormId,
                summary: {
                    categoriesEvaluated: result.categoriesProcessed,
                    totalItemsEvaluated: result.totalItemsProcessed,
                    newItemsCreated: result.newItemsCreated
                }
            }
        });

    } catch (error) {
        if (error instanceof ScopedUserError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Error saving personalized form:", error);
        return NextResponse.json(
            { error: "Error interno del servidor al guardar el formulario personalizado" },
            { status: 500 }
        );
    }

}
