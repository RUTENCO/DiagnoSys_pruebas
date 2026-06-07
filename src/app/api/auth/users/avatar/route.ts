import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";

    if (!avatarUrl) {
      return NextResponse.json({ error: "avatarUrl is required" }, { status: 400 });
    }

    if (!avatarUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid avatar format" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ message: "Avatar updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating avatar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
