import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: organizaciones gestionadas por el consultor
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        if (session.user.role?.name !== 'consultant') return NextResponse.json({ error: "Consultant access required" }, { status: 403 });

        const consultantId = parseInt(session.user.id);

        const organizationUsers = await prisma.user.findMany({
            where: {
                role: { name: 'organization' },
                organizationAudits: { some: { consultantId } }
            },
            include: {
                _count: { select: { organizationAudits: { where: { consultantId } } } },
                organizationAudits: {
                    where: { consultantId },
                    select: { id: true, name: true, description: true, createdAt: true, updatedAt: true, _count: { select: { personalizedForms: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                reports: { select: { id: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const processed = organizationUsers.map(user => ({
            id: user.id,
            sector: user.sector,
            companySize: user.companySize,
            userName: user.name,
            email: user.email,
            stats: { reportsCount: user.reports.length },
            primaryAuditId: user.organizationAudits[0]?.id ?? null,
            recentAudits: user.organizationAudits.slice(0, 3),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));

        return NextResponse.json({ organizations: processed });
    } catch (error) {
        console.error('Error listing organizations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: crear una nueva organización (como usuario `organization`) y crear auditoría inicial
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        if (session.user.role?.name !== 'consultant') return NextResponse.json({ error: "Consultant access required" }, { status: 403 });

        const { name, email, password, sector, companySize } = await request.json();
        if (!name || !email || !password) return NextResponse.json({ error: 'User name, email and password are required' }, { status: 400 });
        if (typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

        const consultantId = parseInt(session.user.id);

        const role = await prisma.role.findUnique({ where: { name: 'organization' }, select: { id: true } });
        if (!role) return NextResponse.json({ error: 'Organization role not found' }, { status: 500 });

        const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (existingUser) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            const organizationUser = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    roleId: role.id,
                    sector: sector || null,
                    companySize: companySize || null,
                },
                select: { id: true, name: true, email: true, sector: true, companySize: true, createdAt: true, updatedAt: true }
            });

            const audit = await tx.audit.create({
                data: {
                    name: `Initial Audit - ${name}`,
                    description: 'Auto-created when organization was registered by consultant',
                    consultantId,
                    organizationUserId: organizationUser.id
                },
                select: { id: true, name: true, createdAt: true }
            });

            return { organizationUser, audit };
        });

        return NextResponse.json({
            organization: {
                id: result.organizationUser.id,
                sector: result.organizationUser.sector,
                companySize: result.organizationUser.companySize,
                stats: { reportsCount: 0 },
                primaryAuditId: result.audit.id,
                recentAudits: [result.audit],
                createdAt: result.organizationUser.createdAt,
                updatedAt: result.organizationUser.updatedAt
            },
            credentials: { userName: result.organizationUser.name, email: result.organizationUser.email, role: 'organization' },
            message: 'Organization user created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating organization:', error);
        if ((error as any)?.code === 'P2002') return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: actualizar datos del usuario organización (solo consultor con relación)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        if (session.user.role?.name !== 'consultant') return NextResponse.json({ error: "Consultant access required" }, { status: 403 });

        const consultantId = parseInt(session.user.id);
        const { orgId, name, email, password, sector, companySize } = await request.json();
        const orgIdInt = parseInt(String(orgId));
        if (isNaN(orgIdInt) || !name || typeof name !== 'string' || !email || typeof email !== 'string') return NextResponse.json({ error: 'Valid organization ID, user name and email are required' }, { status: 400 });
        if (password && (typeof password !== 'string' || password.length < 8)) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

        const organizationUser = await prisma.user.findFirst({
            where: { id: orgIdInt, role: { name: 'organization' }, organizationAudits: { some: { consultantId } } },
            select: { id: true, email: true }
        });
        if (!organizationUser) return NextResponse.json({ error: 'Organization user not found' }, { status: 404 });

        if (organizationUser.email !== email.trim()) {
            const existingUser = await prisma.user.findUnique({ where: { email: email.trim() }, select: { id: true } });
            if (existingUser) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }

        const passwordData = password ? { password: await bcrypt.hash(password, 10) } : {};

        const updatedOrganizationUser = await prisma.user.update({
            where: { id: organizationUser.id },
            data: { name: name.trim(), email: email.trim(), sector: sector || null, companySize: companySize || null, ...passwordData },
            select: { id: true, name: true, email: true, sector: true, companySize: true, updatedAt: true }
        });

        return NextResponse.json({ organization: { id: updatedOrganizationUser.id, sector: updatedOrganizationUser.sector, companySize: updatedOrganizationUser.companySize, userName: updatedOrganizationUser.name, email: updatedOrganizationUser.email, updatedAt: updatedOrganizationUser.updatedAt }, credentials: { userName: updatedOrganizationUser.name, email: updatedOrganizationUser.email }, message: 'Organization user updated successfully' });
    } catch (error) {
        console.error('Error updating organization:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
