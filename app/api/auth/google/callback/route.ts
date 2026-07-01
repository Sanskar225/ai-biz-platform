import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, decodeGoogleIdToken } from "@/lib/auth/google";
import { signAccessToken, issueRefreshToken, setAuthCookies } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get("oauth_state")?.value;
  const verifier = store.get("oauth_verifier")?.value;
  const next = store.get("oauth_next")?.value;
  store.delete("oauth_state");
  store.delete("oauth_verifier");
  store.delete("oauth_next");

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", req.url));
  }

  const tokens = await exchangeCodeForTokens(code, verifier);
  const profile = decodeGoogleIdToken(tokens.id_token);

  // Find an existing user by googleId. New users land on /onboarding to
  // create their tenant (business) before they can use the app — this
  // is the "Business Onboarding" requirement.
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  let isNewUser = false;

  if (!user) {
    // Create a personal tenant placeholder; onboarding will rename/fill it.
    const tenant = await prisma.tenant.create({
      data: {
        name: `${profile.name ?? profile.email}'s Business`,
        slug: `${profile.sub.slice(0, 8)}-${Date.now().toString(36)}`,
      },
    });
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        googleId: profile.sub,
        role: "OWNER",
      },
    });
    isNewUser = true;
    await writeAuditLog({ tenantId: tenant.id, userId: user.id, action: "auth.signup", ip: req.headers.get("x-forwarded-for") ?? undefined });
  } else {
    await writeAuditLog({ tenantId: user.tenantId, userId: user.id, action: "auth.login", ip: req.headers.get("x-forwarded-for") ?? undefined });
  }

  const accessToken = signAccessToken({ sub: user.id, tenantId: user.tenantId, role: user.role });
  const refreshToken = await issueRefreshToken({
    userId: user.id,
    tenantId: user.tenantId,
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  await setAuthCookies(accessToken, refreshToken);

  const dest = isNewUser ? "/onboarding" : next && next.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(new URL(dest, req.url));
}
