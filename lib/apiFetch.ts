"use client";

/**
 * Use this instead of raw fetch() for any authenticated client-side API
 * call. The access_token cookie expires after 15 minutes; without this
 * wrapper every page would start silently failing 15 minutes into a
 * session and look "broken" with no explanation. This calls
 * /api/auth/refresh on a 401 and retries the original request once
 * before giving up and sending the user back to /login.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
  if (!refreshRes.ok) {
    if (typeof window !== "undefined") {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    return res; // caller won't get here in the browser since we just navigated away
  }

  return fetch(input, init); // retry once with the freshly-rotated cookie
}
