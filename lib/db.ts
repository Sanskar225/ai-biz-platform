import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton to avoid exhausting DB connections
// on hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Tenant isolation strategy
 * -------------------------
 * Prisma (free tier Postgres on Neon/Supabase) doesn't give us native
 * Row-Level-Security as conveniently as Supabase's client does, so
 * isolation here is enforced at the application layer, in one place:
 * every read/write that touches tenant data MUST go through
 * `withTenant`, which injects `tenantId` into the `where` clause and
 * throws if a caller forgets to scope a query. This turns "developer
 * remembered to filter by tenant" into "the database layer makes it
 * impossible not to."
 *
 * For Postgres-native defense in depth, see prisma/rls.sql which adds
 * RLS policies as a second line of defense (belt + suspenders) — see
 * README "Security" section for why both layers exist.
 */
export function assertTenantId(tenantId: unknown): asserts tenantId is string {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("Tenant isolation violation: tenantId missing from query context");
  }
}
