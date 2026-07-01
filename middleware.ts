import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_APP_URL
  ? [process.env.NEXT_PUBLIC_APP_URL]
  : ["http://localhost:3000"]);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/agent",
  "/contacts",
  "/opportunities",
  "/conversations",
  "/onboarding",
];

const isDev = process.env.NODE_ENV !== "production";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Auth gate ---
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const hasAccessToken = req.cookies.has("access_token");
    if (!hasAccessToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const res = NextResponse.next();

  // --- Security headers ---
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // CSP: In development Next.js needs 'unsafe-eval' for hot-reload and
  // fast-refresh — without it React hydration is blocked and NO click
  // handlers will fire (this was the root cause of all "buttons do
  // nothing" symptoms). In production we tighten it back up.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com",
      "font-src 'self' data:",
      "frame-src 'none'",
    ].join("; ")
  );

  // --- CORS (API routes only) ---
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    }
  }

  // --- OPTIONS preflight ---
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
