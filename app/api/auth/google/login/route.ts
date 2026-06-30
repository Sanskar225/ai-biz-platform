import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { generatePkcePair, googleAuthUrl } from "@/lib/auth/google";

// GET /api/auth/google/login
export async function GET(req: NextRequest) {
  const { verifier, challenge } = generatePkcePair();
  const state = crypto.randomBytes(16).toString("hex");

  const store = await cookies();
  // Short-lived, http-only cookies just to survive the redirect round trip.
  store.set("oauth_verifier", verifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  store.set("oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });

  return NextResponse.redirect(googleAuthUrl(challenge, state));
}
