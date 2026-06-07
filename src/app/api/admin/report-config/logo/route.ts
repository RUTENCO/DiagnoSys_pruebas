import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const orgIdParam = request.nextUrl.searchParams.get("organizationUserId");
    const orgId = orgIdParam ? Number(orgIdParam) : null;
    if (!orgId) return NextResponse.json({ error: "organizationUserId required" }, { status: 400 });

    const cfg = await prisma.reportDisplayConfig.findUnique({
      where: { organizationUserId: orgId },
      select: { logoData: true, logoContentType: true },
    });

    if (!cfg || !cfg.logoData) {
      // Try to serve a default image from public/logoudea.svg or .png
      const candidates = ["logoudea.svg", "logoudea.png"];
      for (const name of candidates) {
        const fallbackPath = path.join(process.cwd(), "public", name);
        if (fs.existsSync(fallbackPath)) {
          const fileBuf = fs.readFileSync(fallbackPath);
          const headers = new Headers();
          const ext = path.extname(name).toLowerCase();
          headers.set("Content-Type", ext === ".svg" ? "image/svg+xml" : "image/png");
          headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
          return new Response(fileBuf, { status: 200, headers });
        }
      }

      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", cfg.logoContentType || "image/png");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return new Response(Buffer.from(cfg.logoData as Uint8Array), { status: 200, headers });
  } catch (error) {
    console.error("Error serving logo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
