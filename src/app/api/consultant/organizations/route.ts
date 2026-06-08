import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

async function ensureOrganizationUserAndAudit(options: {
    consultantId: number;
    consultantOrganizationId: number;
    name: string;
    email: string;
    sector?: string | null;
    companySize?: string | null;
}) {
    const { consultantId, consultantOrganizationId, name, email, sector, companySize } = options;

    const orgRole = await prisma.role.findUnique({ where: { name: 'organization' }, select: { id: true } });
    if (!orgRole) {
        throw new Error('Organization role not found');
    }

    let organizationUser = await prisma.user.findFirst({
        where: {
            email,
            role: { name: 'organization' },
        },
        select: { id: true },
    });

    if (!organizationUser) {
        const generatedPassword = `${randomBytes(12).toString("base64url")}Aa1!`;
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        const internalEmail = `managed-org-${consultantId}-${Date.now()}-${randomBytes(4).toString("hex")}@managed.local`;

        organizationUser = await prisma.user.create({
            data: {
                name,
                email: internalEmail,
                password: hashedPassword,
                roleId: orgRole.id,
                sector: sector || null,
                companySize: companySize || null,
            },
            select: { id: true },
        });
    }

    await prisma.consultantOrganization.update({
        where: { id: consultantOrganizationId },
        data: { linkedUserId: organizationUser.id },
    });

    const existingAudit = await prisma.audit.findFirst({
        where: {
            consultantId,
            organizationUserId: organizationUser.id,
        },
        select: { id: true },
    });

    if (!existingAudit) {
        await prisma.audit.create({
            data: {
                name: `Initial Audit - ${name}`,
                description: 'Auto-created when organization was registered by consultant',
                consultantId,
                organizationUserId: organizationUser.id,
            },
        });
    }

    return organizationUser.id;
}

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

        for (const organization of organizations) {
            if (!organization.linkedUserId) {
                await ensureOrganizationUserAndAudit({
                    consultantId,
                    consultantOrganizationId: organization.id,
                    name: organization.name,
                    email: organization.email,
                    sector: organization.sector,
                    companySize: organization.companySize,
                });
            }
        }

        const hydratedOrganizations = await prisma.consultantOrganization.findMany({
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

        const processed = hydratedOrganizations.map((organization) => ({
            // Backward compatibility: legacy consumers expect id = organization user id.
            id: organization.linkedUserId ?? organization.id,
            consultantOrganizationId: organization.id,
            organizationUserId: organization.linkedUserId,
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

        const organization = await prisma.consultantOrganization.create({
            data: {
                consultantId,
                name: normalizedName,
                email: normalizedEmail,
                sector: typeof sector === "string" && sector.trim() ? sector.trim() : null,
                companySize: typeof companySize === "string" && companySize.trim() ? companySize.trim() : null,
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

        const linkedUserId = await ensureOrganizationUserAndAudit({
            consultantId,
            consultantOrganizationId: organization.id,
            name: organization.name,
            email: organization.email,
            sector: organization.sector,
            companySize: organization.companySize,
        });

        const linkedUserReports = await prisma.report.count({ where: { userId: linkedUserId } });

        return NextResponse.json({
            organization: {
                id: linkedUserId,
                consultantOrganizationId: organization.id,
                organizationUserId: linkedUserId,
                name: organization.name,
                userName: organization.name,
                sector: organization.sector,
                companySize: organization.companySize,
                email: organization.email,
                linkedUserId,
                stats: { reportsCount: linkedUserReports },
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
            where: {
                consultantId,
                OR: [
                    { id: orgIdInt },
                    { linkedUserId: orgIdInt },
                ],
            },
            select: { id: true, email: true, linkedUserId: true },
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
                linkedUserId: linkedUser?.id ?? organization.linkedUserId ?? null,
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
                id: updatedOrganization.linkedUserId ?? updatedOrganization.id,
                consultantOrganizationId: updatedOrganization.id,
                organizationUserId: updatedOrganization.linkedUserId,
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

        const targetOrganization = await prisma.consultantOrganization.findFirst({
            where: {
                consultantId,
                OR: [
                    { id: orgIdInt },
                    { linkedUserId: orgIdInt },
                ],
            },
            select: {
                id: true,
                linkedUserId: true,
                linkedUser: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        });

        if (!targetOrganization) {
            return NextResponse.json({ error: 'No se pudo eliminar la organizacion' }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            const linkedUserId = targetOrganization.linkedUserId;

            await tx.consultantOrganization.delete({
                where: { id: targetOrganization.id },
            });

            if (!linkedUserId) {
                return;
            }

            const auditIds = await tx.audit.findMany({
                where: {
                    consultantId,
                    organizationUserId: linkedUserId,
                },
                select: { id: true },
            });

            const ids = auditIds.map((audit) => audit.id);

            if (ids.length > 0) {
                await tx.personalizedForm.deleteMany({
                    where: {
                        auditId: { in: ids },
                    },
                });

                await tx.audit.deleteMany({
                    where: {
                        id: { in: ids },
                    },
                });
            }

            const stillLinkedByConsultantOrganization = await tx.consultantOrganization.count({
                where: { linkedUserId },
            });

            const isManagedInternalUser =
                targetOrganization.linkedUser?.email?.startsWith("managed-org-") &&
                targetOrganization.linkedUser?.email?.endsWith("@managed.local");

            if (!stillLinkedByConsultantOrganization && isManagedInternalUser) {
                await tx.reportDisplayConfig.deleteMany({ where: { organizationUserId: linkedUserId } });
                await tx.personalizedForm.deleteMany({ where: { userId: linkedUserId } });
                await tx.report.deleteMany({ where: { userId: linkedUserId } });
                await tx.opportunity.deleteMany({ where: { userId: linkedUserId } });
                await tx.need.deleteMany({ where: { userId: linkedUserId } });
                await tx.problem.deleteMany({ where: { userId: linkedUserId } });
                await tx.highPriority.deleteMany({ where: { userId: linkedUserId } });
                await tx.mediumPriority.deleteMany({ where: { userId: linkedUserId } });
                await tx.lowPriority.deleteMany({ where: { userId: linkedUserId } });
                await tx.mediumPriority2.deleteMany({ where: { userId: linkedUserId } });
                await tx.audit.deleteMany({ where: { organizationUserId: linkedUserId } });
                await tx.resetToken.deleteMany({ where: { userId: linkedUserId } });
                await tx.user.delete({ where: { id: linkedUserId } });
            }
        });

        return NextResponse.json({ message: 'Organizacion eliminada exitosamente' });
    } catch (error) {
        console.error('Error deleting organization from consultant list:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
