import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        console.log('🎯 Consultant Reports API - Starting radar data fetch...');
        
        // Verificar autenticación
        const session = await getServerSession();
        if (!session?.user?.email) {
            console.log('❌ No authenticated session found');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        console.log('✅ Session validated for consultant:', session.user.email);

        // Verificar que el usuario sea consultant
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { role: true }
        });

        if (!user || user.role.name !== 'consultant') {
            console.log('❌ User is not consultant, role:', user?.role?.name);
            return NextResponse.json({ error: 'Not authorized - Consultant access required' }, { status: 403 });
        }

        console.log('✅ Consultant access confirmed for user:', user.id);

        // Primero, vamos a verificar qué formularios existen para este usuario
        const allUserForms = await prisma.personalizedForm.findMany({
            where: {
                userId: user.id
            },
            select: {
                id: true,
                name: true,
                isCompleted: true,
                auditId: true,
                reportId: true,
                completedAt: true
            }
        });

        console.log('🔍 All forms for consultant user:', allUserForms);

        // Para consultant: obtener SUS formularios personalizados (incluye formularios independientes)
        const personalizedForms = await prisma.personalizedForm.findMany({
            where: {
                isCompleted: true,
                userId: user.id // Solo formularios del consultant actual
                // Removemos la restricción de auditId para incluir formularios independientes
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                audit: {
                    select: {
                        id: true,
                        name: true,
                        organizationUser: {
                            select: { id: true }
                        }
                    }
                },
                personalizedCategories: {
                    include: {
                        personalizedItems: true,
                        baseCategory: true
                    }
                },
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
                }
            },
            orderBy: {
                completedAt: 'desc'
            }
        });

        console.log('📊 Found', personalizedForms.length, 'completed forms for consultant');

        // Agrupar por auditoría/reporte y módulo para obtener el más reciente
        const latestFormsByContextAndModule = new Map();

        personalizedForms.forEach(form => {
            // Crear clave única considerando auditoría, reporte o formulario independiente
            const contextId = form.auditId || form.reportId || 'independent';
            const key = `${contextId}_${form.baseForm.module.name}`;
            const existing = latestFormsByContextAndModule.get(key);
            
            if (!existing || new Date(form.completedAt!) > new Date(existing.completedAt!)) {
                latestFormsByContextAndModule.set(key, form);
            }
        });

        const latestForms = Array.from(latestFormsByContextAndModule.values());
        console.log('📈 Processed to', latestForms.length, 'latest forms per context per module');

        // Debug: ver qué módulos tenemos
        latestForms.forEach(form => {
            console.log(`🔍 Form "${form.name}" has module: "${form.baseForm.module.name}"`);
        });

        // Separar por módulo
        const zoomInForms = latestForms.filter(form => form.baseForm.module.name === 'Zoom In');
        const zoomOutForms = latestForms.filter(form => form.baseForm.module.name === 'Zoom Out');

        console.log('🔍 ZoomIn forms:', zoomInForms.length);
        console.log('🔭 ZoomOut forms:', zoomOutForms.length);

        // Función para procesar datos de categorías
        const processFormData = (forms: typeof personalizedForms) => {
            return forms.map(form => {
                // Procesar categorías personalizadas
                const categoryData = form.personalizedCategories.map(category => {
                    // Calcular estadísticas de la categoría
                    const items = category.personalizedItems;
                    const totalScore = items.reduce((sum, item) => sum + item.score, 0);
                    const avgScore = items.length > 0 ? totalScore / items.length : 0;
                    const maxScore = 5; // Asumiendo máximo de 5 por item
                    
                    return {
                        name: category.name,
                        score: Math.round(avgScore * 100) / 100,
                        maxScore: maxScore,
                        itemCount: items.length,
                        totalScore: totalScore
                    };
                });

                // Calcular estadísticas generales
                const allItems = form.personalizedCategories.flatMap(cat => cat.personalizedItems);
                const totalItems = allItems.length;
                const totalScore = allItems.reduce((sum, item) => sum + item.score, 0);
                const maxPossibleScore = totalItems * 5; // Máximo 5 por item
                const avgScore = totalItems > 0 ? Math.round((totalScore / totalItems) * 100) / 100 : 0;
                const completionPercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

                return {
                    id: form.id,
                    name: form.baseForm.name,
                    module: form.baseForm.module.name,
                    isCompleted: form.isCompleted,
                    completedAt: form.completedAt,
                    audit: {
                        name: form.audit?.name || 'Independent Assessment',
                        organizationUserId: form.audit?.organizationUser?.id || null
                    },
                    categoryData,
                    stats: {
                        totalItems,
                        totalScore,
                        avgScore,
                        maxPossibleScore,
                        completionPercentage
                    }
                };
            });
        };

        const processedZoomInForms = processFormData(zoomInForms);
        const processedZoomOutForms = processFormData(zoomOutForms);

        console.log('✅ Successfully processed all forms for consultant view');

        return NextResponse.json({
            zoomInForms: processedZoomInForms,
            zoomOutForms: processedZoomOutForms,
            message: `Consultant view: Found ${processedZoomInForms.length} ZoomIn forms and ${processedZoomOutForms.length} ZoomOut forms from your audits`
        });

    } catch (error) {
        console.error('🚨 Consultant Reports API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch consultant radar data', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
