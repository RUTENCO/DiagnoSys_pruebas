import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * GET /api/consultant/organizations
 * Ver organizaciones disponibles para auditar (solo consultant)
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

        // Solo consultores pueden ver organizaciones
        if (session.user.role?.name !== 'consultant') {
            return NextResponse.json(
                { error: "Consultant access required" },
                { status: 403 }
            );
        }

        const consultantId = parseInt(session.user.id);

        // Obtener organizaciones y sus auditorías relacionadas con este consultor
        const organizations = await prisma.organization.findMany({
            where: {
                audits: {
                    some: {
                        consultantId: consultantId,
                    },
                },
            },
            include: {
                users: {
                    where: {
                        role: {
                            name: "organization"
                        }
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                    take: 1,
                },
                _count: {
                    select: {
                        audits: {
                            where: {
                                consultantId: consultantId
                            }
                        }
                    }
                },
                audits: {
                    where: {
                        consultantId: consultantId
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        createdAt: true,
                        updatedAt: true,
                        _count: {
                            select: {
                                personalizedForms: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Procesar datos
        const processedOrganizations = organizations.map(org => ({
            id: org.id,
            name: org.name,
            description: org.description,
            userName: org.users[0]?.name ?? "",
            email: org.users[0]?.email ?? "",
            stats: {
                myAuditsCount: org._count.audits,
                totalFormsCount: org.audits.reduce((sum, audit) => sum + audit._count.personalizedForms, 0)
            },
            primaryAuditId: org.audits[0]?.id ?? null,
            recentAudits: org.audits.slice(0, 3), // Solo las 3 más recientes
            createdAt: org.createdAt,
            updatedAt: org.updatedAt
        }));

        return NextResponse.json({
            organizations: processedOrganizations,
            message: "Organizations retrieved successfully"
        });

    } catch (error) {
        console.error("Error fetching consultant organizations:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/consultant/organizations
 * Crear nueva organización para auditar (solo consultant)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // Solo consultores pueden crear organizaciones
        if (session.user.role?.name !== 'consultant') {
            return NextResponse.json(
                { error: "Consultant access required" },
                { status: 403 }
            );
        }

        const { organizationName, name, email, password, description } = await request.json();

        if (!organizationName || !name || !email || !password) {
            return NextResponse.json(
                { error: "Organization name, user name, email and password are required" },
                { status: 400 }
            );
        }

        if (typeof password !== "string" || password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        const consultantId = parseInt(session.user.id);

        const role = await prisma.role.findUnique({
            where: { name: "organization" },
            select: { id: true },
        });

        if (!role) {
            return NextResponse.json(
                { error: "Organization role not found" },
                { status: 500 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            const organization = await tx.organization.create({
                data: {
                    name: organizationName,
                    description: description || null,
                },
            });

            const organizationUser = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    roleId: role.id,
                    organizationId: organization.id,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            });

            const audit = await tx.audit.create({
                data: {
                    name: `Initial Audit - ${organization.name}`,
                    description: "Auto-created when organization was registered by consultant",
                    consultantId,
                    organizationId: organization.id,
                },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                },
            });

            return { organization, organizationUser, audit };
        });

        return NextResponse.json({
            organization: {
                id: result.organization.id,
                name: result.organization.name,
                description: result.organization.description,
                stats: {
                    myAuditsCount: 1,
                    totalFormsCount: 0
                },
                primaryAuditId: result.audit.id,
                recentAudits: [result.audit],
                createdAt: result.organization.createdAt,
                updatedAt: result.organization.updatedAt
            },
            credentials: {
                userName: result.organizationUser.name,
                email: result.organizationUser.email,
                role: "organization",
            },
            message: "Organization created successfully"
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating organization:", error);
        
        if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
            return NextResponse.json(
                { error: "Organization name already exists" },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/consultant/organizations
 * Editar organización existente del consultor
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        if (session.user.role?.name !== "consultant") {
            return NextResponse.json(
                { error: "Consultant access required" },
                { status: 403 }
            );
        }

        const consultantId = parseInt(session.user.id);
        const { orgId, organizationName, description, name, email, password } = await request.json();

        const orgIdInt = parseInt(String(orgId));
        if (
            isNaN(orgIdInt) ||
            !organizationName || typeof organizationName !== "string" ||
            !name || typeof name !== "string" ||
            !email || typeof email !== "string"
        ) {
            return NextResponse.json(
                { error: "Valid organization ID, organization name, user name and email are required" },
                { status: 400 }
            );
        }

        if (password && (typeof password !== "string" || password.length < 8)) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        const hasAccess = await prisma.organization.findFirst({
            where: {
                id: orgIdInt,
                audits: {
                    some: {
                        consultantId,
                    },
                },
            },
            select: { id: true },
        });

        if (!hasAccess) {
            return NextResponse.json(
                { error: "Organization not found or access denied" },
                { status: 404 }
            );
        }

        const organizationUser = await prisma.user.findFirst({
            where: {
                organizationId: orgIdInt,
                role: {
                    name: "organization",
                },
            },
            select: {
                id: true,
                email: true,
            },
        });

        if (!organizationUser) {
            return NextResponse.json(
                { error: "Organization user not found" },
                { status: 404 }
            );
        }

        if (organizationUser.email !== email.trim()) {
            const existingUser = await prisma.user.findUnique({
                where: { email: email.trim() },
                select: { id: true },
            });

            if (existingUser) {
                return NextResponse.json(
                    { error: "Email already registered" },
                    { status: 409 }
                );
            }
        }

        const passwordData = password
            ? { password: await bcrypt.hash(password, 10) }
            : {};

        const updatedResult = await prisma.$transaction(async (tx) => {
            const updatedOrganization = await tx.organization.update({
                where: { id: orgIdInt },
                data: {
                    name: organizationName.trim(),
                    description: typeof description === "string" && description.trim().length > 0
                        ? description.trim()
                        : null,
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    updatedAt: true,
                },
            });

            const updatedOrganizationUser = await tx.user.update({
                where: { id: organizationUser.id },
                data: {
                    name: name.trim(),
                    email: email.trim(),
                    ...passwordData,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    updatedAt: true,
                },
            });

            return { updatedOrganization, updatedOrganizationUser };
        });

        return NextResponse.json({
            organization: updatedResult.updatedOrganization,
            credentials: {
                userName: updatedResult.updatedOrganizationUser.name,
                email: updatedResult.updatedOrganizationUser.email,
            },
            message: "Organization updated successfully",
        });
    } catch (error) {
        console.error("Error updating organization:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
