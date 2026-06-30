import { prisma } from "@/lib/db";

export async function writeAuditLog(opts: {
  tenantId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  return prisma.auditLog.create({
    data: {
      tenantId: opts.tenantId,
      userId: opts.userId,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      metadata: opts.metadata as any,
      ip: opts.ip,
    },
  });
}
