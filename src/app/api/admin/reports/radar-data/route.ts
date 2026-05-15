import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        console.log('🎯 Admin Reports API - Starting radar data fetch...');
        
        // Verificar autenticación
        const session = await getServerSession();
        if (!session?.user?.email) {
            console.log('❌ No authenticated session found');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        console.log('✅ Session validated for admin:', session.user.email);

        // Verificar que el usuario sea admin
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { role: true }
        });

        if (!user || user.role.name !== 'admin') {
            console.log('❌ User is not admin, role:', user?.role?.name);
            return NextResponse.json({ error: 'Not authorized - Admin access required' }, { status: 403 });
        }

        console.log('✅ Admin access confirmed for user:', user.id);

        // Primero, verificar qué formularios existen
        const allForms = await prisma.personalizedForm.findMany({
            select: {
                id: true,
                name: true,
                isCompleted: true,
                auditId: true,
                reportId: true,
                userId: true
            }
        });

        console.log('🔍 All forms in database:', allForms);

        // Para admin: obtener formularios de TODAS las organizaciones
        const personalizedForms = await prisma.personalizedForm.findMany({
            where: {
                isCompleted: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
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
                        module: true
                    }
                }
            },
            orderBy: {
                completedAt: 'desc'
            }
        });

        console.log('📊 Found', personalizedForms.length, 'completed forms across all organizations');

        // Agrupar por usuario y módulo para obtener el más reciente
        const latestFormsByUserAndModule = new Map();

        personalizedForms.forEach(form => {
            const key = `${form.userId}_${form.baseForm.module.name}`;
            const existing = latestFormsByUserAndModule.get(key);
            
            if (!existing || new Date(form.completedAt!) > new Date(existing.completedAt!)) {
                latestFormsByUserAndModule.set(key, form);
            }
        });

        const latestForms = Array.from(latestFormsByUserAndModule.values());
        console.log('📈 Processed to', latestForms.length, 'latest forms per user per module');

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
                    user: {
                        name: form.user.name,
                        email: form.user.email,
                        organizationUserId: form.user.id
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

        console.log('✅ Successfully processed all forms for admin view');

        return NextResponse.json({
            zoomInForms: processedZoomInForms,
            zoomOutForms: processedZoomOutForms,
            message: `Admin view: Found ${processedZoomInForms.length} ZoomIn forms and ${processedZoomOutForms.length} ZoomOut forms across all organizations`
        });

    } catch (error) {
        console.error('🚨 Admin Reports API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admin radar data', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
