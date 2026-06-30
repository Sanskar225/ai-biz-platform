import { cookies } from "next/headers";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/auth/tokens";

export class UnauthorizedError extends Error {
  constructor(msg = "Unauthorized") {
    super(msg);
    this.name = "UnauthorizedError";
  }
}

/**
 * Reads + verifies the access_token cookie and returns the decoded
 * payload, which is the ONLY source of `tenantId` that route handlers
 * should trust. Never accept tenantId from the request body/query —
 * that would let a malicious client read/write another tenant's data.
 */
export async function getAuthContext(): Promise<AccessTokenPayload> {
  const store = await cookies();
  const token = store.get("access_token")?.value;
  if (!token) throw new UnauthorizedError("Missing access token");

  try {
    return verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}
