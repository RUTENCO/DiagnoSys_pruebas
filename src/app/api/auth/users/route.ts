import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma"; //  Usa la instancia global
import bcrypt from "bcryptjs";

/**
 * GET /api/users
 * Solo el admin puede listar todos los usuarios.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized. You must log in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const onlyMe = searchParams.get("me") === "true";

    if (onlyMe) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          sector: true,
          companySize: true,
          role: {
            select: {
              name: true,
              displayName: true,
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(user, { status: 200 });
    }

    if (!session || session.user?.role?.name !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Only the administrator can list users." },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      include: {
        role: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Error fetching users", details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Solo puede usarse si el usuario está autenticado.
 * - Si es admin → puede actualizar cualquier usuario.
 * - Si no es admin → solo puede actualizar su propio perfil.
 */

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized. You must log in." },
        { status: 401 }
      );
    }

    const { email, name, sector, companySize, password, currentPassword, avatarUrl } = await req.json();

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validar permisos
    const isAdmin = session.user.role?.name === "admin";
    const isSelf = session.user.email === email;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: "Unauthorized to modify this user." },
        { status: 403 }
      );
    }

    // Si hay una nueva contraseña, verificar si la contraseña actual es correcta
    if (password && currentPassword) {
      const isPasswordCorrect = await bcrypt.compare(currentPassword, existingUser.password);
      if (!isPasswordCorrect) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        name,
        sector: sector ?? null,
        companySize: companySize ?? null,
        ...(typeof avatarUrl === "string" ? { avatarUrl } : {}),
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      },
    });

    return NextResponse.json(
      { message: "Profile updated successfully.", user: updatedUser },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
