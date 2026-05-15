import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import type { User, Prisma } from '@prisma/client'

/**
 * Helper functions for API error handling and common validations
 */

interface PrismaError {
    code?: string;
    message?: string;
}

export interface AuthenticatedUser {
    id: number
    email: string
    name: string
    roleId: number
    role: {
        name: string
    }
}
export interface ValidatedParams {
    organizationId: number
    auditId: number
    organization: User
    audit: Prisma.AuditGetPayload<{ include: { consultant: true; organizationUser: true } }>
}


export function isPrismaError(error: unknown): error is PrismaError {
    return typeof error === 'object' && error !== null && 'code' in error;
}

export function handlePrismaError(error: unknown): { message: string; status: number } {
    if (!isPrismaError(error)) {
        return { message: "Internal server error", status: 500 };
    }

    switch (error.code) {
        case 'P2002':
            return { message: "Record already exists", status: 409 };
        case 'P2025':
            return { message: "Record not found", status: 404 };
        case 'P2003':
            return { message: "Foreign key constraint failed", status: 400 };
        case 'P2014':
            return { message: "Invalid ID provided", status: 400 };
        default:
            return { message: "Database error", status: 500 };
    }
}

/**
 * Valida la autenticación del usuario
 */
export async function validateAuth(): Promise<AuthenticatedUser | null> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return null
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(session.user.id) },
            include: { role: true }
        })

        return user
    } catch (error) {
        console.error('Error validating auth:', error)
        return null
    }
}

/**
 * Valida que el usuario tenga acceso a la organización y auditoría
 */
export async function validateOrganizationAndAudit(
    organizationId: string,
    auditId: string,
    user: AuthenticatedUser
): Promise<ValidatedParams | null> {
    try {
        const orgId = parseInt(organizationId)
        const audId = parseInt(auditId)

        if (isNaN(orgId) || isNaN(audId)) {
            return null
        }

        // Verificar que el usuario (owner) exista como `organization` user o que el caller tenga acceso
        const organization = await prisma.user.findFirst({
            where: {
                id: orgId,
                role: { name: 'organization' },
                OR: [
                    // Si es admin, puede acceder a cualquier organización
                    user.role.name === 'admin' ? {} : { id: -1 },
                    // Si el caller es la misma organización
                    { id: user.id },
                    // Si es consultor asignado a auditorías de esta organización
                    { organizationAudits: { some: { consultantId: user.id } } },
                ].filter(condition => Object.keys(condition).length > 0),
            },
        })

        if (!organization) {
            return null
        }

        // Verificar que la auditoría existe y pertenece a la organización
        const audit = await prisma.audit.findFirst({
            where: {
                id: audId,
                organizationUserId: orgId,
                OR: [
                    // Si es admin, puede acceder a cualquier auditoría
                    user.role.name === 'admin' ? {} : { id: -1 },
                    // Si es consultor de esta auditoría
                    { consultantId: user.id },
                    // Si es la organización auditada (caller is org user)
                    { organizationUser: { id: user.id } },
                ].filter(condition => Object.keys(condition).length > 0),
            },
            include: {
                consultant: true,
                organizationUser: true,
            },
        })

        if (!audit) {
            return null
        }

        return {
            organizationId: orgId,
            auditId: audId,
            organization,
            audit,
        }
    } catch (error) {
        console.error('Error validating organization and audit:', error)
        return null
    }
}

/**
 * Obtiene un módulo por nombre
 */
export async function getModuleByName(moduleName: 'Zoom In' | 'Zoom Out') {
    try {
        const moduleData = await prisma.module.findFirst({
            where: { name: moduleName },
        })
        return moduleData
    } catch (error) {
        console.error(`Error fetching ${moduleName} module:`, error)
        return null
    }
}

/**
 * Respuesta de error estándar
 */
export function errorResponse(message: string, status: number = 500) {
    return NextResponse.json({ error: message }, { status })
}

/**
 * Respuesta de éxito estándar
 */
export function successResponse(data: unknown, status: number = 200) {
    return NextResponse.json(data, { status })
}

export function calculateAverageScore(scores: (number | null)[]): number | null {
    const validScores = scores.filter((score): score is number => score !== null && typeof score === 'number');

    if (validScores.length === 0) {
        return null;
    }

    const sum = validScores.reduce((acc, score) => acc + score, 0);
    return Math.round((sum / validScores.length) * 100) / 100;
}

export interface RoleDistribution {
    [roleName: string]: {
        total: number;
        scored: number;
    };
}
