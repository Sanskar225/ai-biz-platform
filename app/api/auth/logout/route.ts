import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { clearAuthCookies } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const store = await cookies();
  const refreshCookie = store.get("refresh_token")?.value;

  if (refreshCookie) {
    try {
      const jwt = (await import("jsonwebtoken")).default;
      const decoded = jwt.verify(refreshCookie, process.env.JWT_REFRESH_SECRET!) as { raw: string };
      const tokenHash = crypto.createHash("sha256").update(decoded.raw).digest("hex");
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // already invalid, nothing to revoke
    }
  }

  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
