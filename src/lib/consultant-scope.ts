import { prisma } from "@/lib/prisma";

export class ScopedUserError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ScopedUserError";
    this.status = status;
  }
}

interface ScopedUserResult {
  targetUserId: number;
  scope: "self" | "organization";
  organizationId?: number;
}

// Resolves the data ownership target. Consultants must work under a selected organization.
export async function resolveScopedUserForDiagnostics(
  sessionUserId: string,
  organizationIdParam: string | null
): Promise<ScopedUserResult> {
  const sessionUserIdInt = parseInt(sessionUserId, 10);

  if (Number.isNaN(sessionUserIdInt)) {
    throw new ScopedUserError("Invalid session user ID", 400);
  }

  const sessionUser = await prisma.user.findUnique({
    where: { id: sessionUserIdInt },
    include: { role: true },
  });

  if (!sessionUser) {
    throw new ScopedUserError("User not found", 404);
  }

  if (sessionUser.role.name !== "consultant") {
    return { targetUserId: sessionUser.id, scope: "self" };
  }

  if (!organizationIdParam) {
    throw new ScopedUserError(
      "Consultant must select an organization before saving diagnostics",
      400
    );
  }

  const organizationId = parseInt(organizationIdParam, 10);
  if (Number.isNaN(organizationId)) {
    throw new ScopedUserError("Invalid organization ID", 400);
  }

  const hasAccessToOrganization = await prisma.audit.findFirst({
    where: {
      consultantId: sessionUser.id,
      organizationId,
    },
    select: { id: true },
  });

  if (!hasAccessToOrganization) {
    throw new ScopedUserError("Consultant has no access to this organization", 403);
  }

  const organizationUser = await prisma.user.findFirst({
    where: {
      organizationId,
      role: {
        name: "organization",
      },
    },
    select: { id: true },
  });

  if (!organizationUser) {
    throw new ScopedUserError(
      "No organization user found for selected organization",
      404
    );
  }

  return {
    targetUserId: organizationUser.id,
    scope: "organization",
    organizationId,
  };
}
