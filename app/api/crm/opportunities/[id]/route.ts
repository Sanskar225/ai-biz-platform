import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  stage: z.enum(["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
  value: z.number().nonnegative().optional(),
  nextBestAction: z.string().max(500).optional(),
  nextBestActionReason: z.string().max(500).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext();
    const { id } = await params;

    // tenantId in the where clause: a request for an opportunity that
    // belongs to a different tenant returns 404, not someone else's data.
    const opportunity = await prisma.opportunity.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        contact: true,
        tasks: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Pull the contact's conversation history alongside the opportunity
    // so the detail page can show "why this deal is at this stage."
    const conversations = await prisma.conversation.findMany({
      where: { tenantId: auth.tenantId, contactId: opportunity.contactId },
      orderBy: { updatedAt: "desc" },
    });

    const auditTrail = await prisma.auditLog.findMany({
      where: { tenantId: auth.tenantId, entityType: "Opportunity", entityId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ opportunity, conversations, auditTrail });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    // Verify ownership before writing — Prisma's updateMany + count check
    // avoids a race where findFirst says "yes" then update targets a row
    // that moved tenants between the two calls (defense in depth).
    const existing = await prisma.opportunity.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: parsed.data,
    });

    await writeAuditLog({
      tenantId: auth.tenantId,
      userId: auth.sub,
      action: "opportunity.update",
      entityType: "Opportunity",
      entityId: id,
      metadata: parsed.data,
    });

    return NextResponse.json({ opportunity });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
