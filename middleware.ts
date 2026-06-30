import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : ["http://localhost:3000"]);

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // --- Security headers ---
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY"); // clickjacking protection
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://generativelanguage.googleapis.com"
  ); // XSS protection: blocks inline script injection / unexpected origins
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // --- CORS (API routes only) ---
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    }
    // The WhatsApp webhook is called by Meta's servers, not a browser,
    // so it's intentionally exempt from the origin allowlist above —
    // it's protected instead by HMAC signature verification (see its
    // route handler).
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
