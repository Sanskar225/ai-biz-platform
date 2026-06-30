import jwt from "jsonwebtoken";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL ?? "15m";
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);

export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a brand-new refresh token chain (used at login).
 */
export async function issueRefreshToken(opts: {
  userId: string;
  tenantId: string;
  userAgent?: string;
  ip?: string;
}) {
  const raw = crypto.randomBytes(48).toString("hex");
  const family = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tenantId: opts.tenantId,
      userId: opts.userId,
      tokenHash: hashToken(raw),
      family,
      expiresAt,
      userAgent: opts.userAgent,
      ip: opts.ip,
    },
  });

  // The cookie value encodes the raw secret AND the row id so we can
  // look the row up without scanning the table.
  return signRefreshCookie(raw, family);
}

function signRefreshCookie(raw: string, family: string) {
  // The JWT here is just a transport envelope (not the source of trust —
  // the DB row + tokenHash is). This lets us embed `family` without an
  // extra DB round trip, while still being able to revoke server-side.
  return jwt.sign({ raw, family }, REFRESH_SECRET, { expiresIn: `${REFRESH_TTL_DAYS}d` } as jwt.SignOptions);
}

/**
 * Rotation with reuse detection:
 * 1. Verify + decode the presented refresh cookie.
 * 2. Find the matching DB row by tokenHash.
 * 3. If the row is already revoked -> someone replayed an old token.
 *    This is a strong signal of theft, so we revoke the ENTIRE family
 *    (every token ever issued in that chain) and force re-login.
 * 4. Otherwise, revoke this row, issue a new one in the same family,
 *    and return new access + refresh tokens.
 */
export async function rotateRefreshToken(cookieValue: string, opts: { userAgent?: string; ip?: string }) {
  let decoded: { raw: string; family: string };
  try {
    decoded = jwt.verify(cookieValue, REFRESH_SECRET) as { raw: string; family: string };
  } catch {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const tokenHash = hashToken(decoded.raw);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!row) throw new Error("INVALID_REFRESH_TOKEN");

  if (row.revokedAt) {
    // Reuse of a revoked token — possible theft. Nuke the whole chain.
    await prisma.refreshToken.updateMany({
      where: { family: row.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new Error("REFRESH_REUSE_DETECTED");
  }

  if (row.expiresAt < new Date()) throw new Error("REFRESH_EXPIRED");

  const newRaw = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  const newRow = await prisma.refreshToken.create({
    data: {
      tenantId: row.tenantId,
      userId: row.userId,
      tokenHash: hashToken(newRaw),
      family: row.family,
      expiresAt,
      userAgent: opts.userAgent,
      ip: opts.ip,
    },
  });

  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date(), replacedById: newRow.id },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: row.userId } });

  return {
    accessToken: signAccessToken({ sub: user.id, tenantId: user.tenantId, role: user.role }),
    refreshCookie: signRefreshCookie(newRaw, row.family),
    user,
  };
}

export async function revokeAllSessionsForUser(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// --- Cookie helpers (HTTP-only, Secure, SameSite=Lax) ---

const isProd = process.env.NODE_ENV === "production";

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  store.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth", // only sent to auth endpoints — reduces XSS blast radius
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete("access_token");
  store.delete("refresh_token");
}
