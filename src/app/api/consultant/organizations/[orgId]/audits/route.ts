import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// GET: listar auditorías de una organización para el consultor
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await context.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        if (session.user.role?.name !== 'consultant') {
            return NextResponse.json({ error: "Consultant access required" }, { status: 403 });
        }

        const orgIdInt = parseInt(orgId);
        const consultantId = parseInt(session.user.id);
        if (isNaN(orgIdInt)) return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });

        // Buscar usuario que representa la organización
        const organizationUser = await prisma.user.findFirst({
            where: { id: orgIdInt, role: { name: 'organization' } },
            select: { id: true, name: true, email: true, sector: true, companySize: true }
        });

        if (!organizationUser) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

        const audits = await prisma.audit.findMany({
            where: { organizationUserId: orgIdInt, consultantId },
            include: {
                personalizedForms: {
                    include: {
                        baseForm: { select: { id: true, name: true } },
                        _count: { select: { personalizedCategories: true } }
                    }
                },
                _count: { select: { personalizedForms: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const processedAudits = audits.map(audit => {
            const completedForms = audit.personalizedForms.filter(f => f.isCompleted).length;
            const totalForms = audit.personalizedForms.length;
            const completionRate = totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

            return {
                id: audit.id,
                name: audit.name,
                description: audit.description,
                organization: organizationUser,
                stats: {
                    totalForms: audit._count.personalizedForms,
                    completedForms,
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

        return NextResponse.json({ organization: organizationUser, audits: processedAudits, message: "Audits retrieved successfully" });

    } catch (error) {
        console.error("Error fetching organization audits:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: crear auditoría para la organización (consultant)
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await context.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        if (session.user.role?.name !== 'consultant') return NextResponse.json({ error: "Consultant access required" }, { status: 403 });

        const orgIdInt = parseInt(orgId);
        const consultantId = parseInt(session.user.id);
        if (isNaN(orgIdInt)) return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });

        const { name, description } = await request.json();
        if (!name) return NextResponse.json({ error: "Audit name is required" }, { status: 400 });

        const organizationUser = await prisma.user.findFirst({ where: { id: orgIdInt, role: { name: 'organization' } } });
        if (!organizationUser) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

        const audit = await prisma.audit.create({
            data: {
                name,
                description: description || null,
                consultantId,
                organizationUserId: orgIdInt
            },
            include: {
                consultant: { select: { id: true, name: true } },
                organizationUser: { select: { id: true, name: true, email: true } }
            }
        });

        return NextResponse.json({ audit, message: "Audit created successfully" }, { status: 201 });

    } catch (error) {
        console.error("Error creating audit:", error);
        if ((error as any)?.code === 'P2002') return NextResponse.json({ error: "Audit name already exists" }, { status: 409 });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
