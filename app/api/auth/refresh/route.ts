import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rotateRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth/tokens";

export async function POST(req: NextRequest) {
  const store = await cookies();
  const refreshCookie = store.get("refresh_token")?.value;

  if (!refreshCookie) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  try {
    const { accessToken, refreshCookie: newRefresh } = await rotateRefreshToken(refreshCookie, {
      userAgent: req.headers.get("user-agent") ?? undefined,
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });
    await setAuthCookies(accessToken, newRefresh);
    return NextResponse.json({ ok: true });
  } catch (err) {
    await clearAuthCookies();
    const reason = err instanceof Error ? err.message : "REFRESH_FAILED";
    // REFRESH_REUSE_DETECTED means a token was replayed — force full re-login.
    return NextResponse.json({ error: reason }, { status: 401 });
  }
}
