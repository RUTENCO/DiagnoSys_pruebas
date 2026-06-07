import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        if (session.user.role?.name !== 'consultant') return NextResponse.json({ error: "Consultant access required" }, { status: 403 });

        const consultantId = Number.parseInt(session.user.id, 10);

        const organizations = await prisma.consultantOrganization.findMany({
            where: {
                consultantId,
            },
            include: {
                linkedUser: {
                    select: {
                        id: true,
                        reports: {
                            select: { id: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' }
        });

        const processed = organizations.map((organization) => ({
            id: organization.id,
            name: organization.name,
            userName: organization.name,
            sector: organization.sector,
            companySize: organization.companySize,
            email: organization.email,
            linkedUserId: organization.linkedUserId,
            stats: { reportsCount: organization.linkedUser?.reports.length ?? 0 },
            createdAt: organization.createdAt,
            updatedAt: organization.updatedAt,
        }));

        return NextResponse.json({ organizations: processed });
    } catch (error) {
        console.error('Error listing organizations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        if (session.user.role?.name !== 'consultant') return NextResponse.json({ error: "Consultant access required" }, { status: 403 });

        const { name, email, sector, companySize } = await request.json();
        const normalizedName = typeof name === "string" ? name.trim() : "";
        const normalizedEmail = typeof email === "string" ? email.trim() : "";

        if (!normalizedName || !normalizedEmail) return NextResponse.json({ error: 'User name and email are required' }, { status: 400 });

        const consultantId = Number.parseInt(session.user.id, 10);

        const existingOrganization = await prisma.consultantOrganization.findUnique({
            where: {
                consultantId_email: {
                    consultantId,
                    email: normalizedEmail,
                },
            },
            select: { id: true },
        });

        if (existingOrganization) {
            return NextResponse.json({ error: 'Organization already exists in your list' }, { status: 409 });
        }

        const linkedUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, reports: { select: { id: true } } },
        });

        const organization = await prisma.consultantOrganization.create({
            data: {
                consultantId,
                name: normalizedName,
                email: normalizedEmail,
                sector: typeof sector === "string" && sector.trim() ? sector.trim() : null,
                companySize: typeof companySize === "string" && companySize.trim() ? companySize.trim() : null,
                linkedUserId: linkedUser?.id ?? null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                sector: true,
                companySize: true,
                linkedUserId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({
            organization: {
                id: organization.id,
                name: organization.name,
                userName: organization.name,
                sector: organization.sector,
                companySize: organization.companySize,
                email: organization.email,
                linkedUserId: organization.linkedUserId,
                stats: { reportsCount: linkedUser?.reports.length ?? 0 },
                createdAt: organization.createdAt,
                updatedAt: organization.updatedAt,
            },
            message: 'Organization added to your consultant list successfully',
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating organization:', error);
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'Email already registered in this consultant list' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        if (session.user.role?.name !== 'consultant') return NextResponse.json({ error: "Consultant access required" }, { status: 403 });

        const consultantId = Number.parseInt(session.user.id, 10);
        const { orgId, name, email, sector, companySize } = await request.json();
        const orgIdInt = Number.parseInt(String(orgId), 10);
        const normalizedName = typeof name === "string" ? name.trim() : "";
        const normalizedEmail = typeof email === "string" ? email.trim() : "";

        if (Number.isNaN(orgIdInt) || !normalizedName || !normalizedEmail) return NextResponse.json({ error: 'Valid organization ID, user name and email are required' }, { status: 400 });

        const organization = await prisma.consultantOrganization.findFirst({
            where: { id: orgIdInt, consultantId },
            select: { id: true, email: true },
        });
        if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

        const duplicateOrganization = await prisma.consultantOrganization.findFirst({
            where: {
                consultantId,
                email: normalizedEmail,
                NOT: { id: orgIdInt },
            },
            select: { id: true },
        });
        if (duplicateOrganization) return NextResponse.json({ error: 'Email already registered in this consultant list' }, { status: 409 });

        const linkedUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        });

        const updatedOrganization = await prisma.consultantOrganization.update({
            where: { id: organization.id },
            data: {
                name: normalizedName,
                email: normalizedEmail,
                sector: typeof sector === "string" && sector.trim() ? sector.trim() : null,
                companySize: typeof companySize === "string" && companySize.trim() ? companySize.trim() : null,
                linkedUserId: linkedUser?.id ?? null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                sector: true,
                companySize: true,
                linkedUserId: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({
            organization: {
                id: updatedOrganization.id,
                name: updatedOrganization.name,
                userName: updatedOrganization.name,
                email: updatedOrganization.email,
                sector: updatedOrganization.sector,
                companySize: updatedOrganization.companySize,
                linkedUserId: updatedOrganization.linkedUserId,
                updatedAt: updatedOrganization.updatedAt,
            },
            message: 'Organization updated successfully',
        });
    } catch (error) {
        console.error('Error updating organization:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        if (session.user.role?.name !== 'consultant') return NextResponse.json({ error: "Consultant access required" }, { status: 403 });

        const consultantId = Number.parseInt(session.user.id, 10);
        const { orgId } = await request.json();
        const orgIdInt = Number.parseInt(String(orgId), 10);

        if (Number.isNaN(orgIdInt)) {
            return NextResponse.json({ error: 'Valid organization ID is required' }, { status: 400 });
        }

        const deleted = await prisma.consultantOrganization.deleteMany({
            where: {
                id: orgIdInt,
                consultantId,
            },
        });

        if (deleted.count === 0) {
            return NextResponse.json({ error: 'No se pudo eliminar la organizacion' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Organizacion eliminada exitosamente' });
    } catch (error) {
        console.error('Error deleting organization from consultant list:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
