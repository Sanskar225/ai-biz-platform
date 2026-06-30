import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  contactId: z.string(),
  title: z.string().min(1).max(200),
  value: z.number().nonnegative().default(0),
  stage: z.enum(["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).default("NEW"),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const opportunities = await prisma.opportunity.findMany({
      where: { tenantId: auth.tenantId },
      include: { contact: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ opportunities });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Verify the contact belongs to this tenant before linking — prevents
    // a malicious/buggy client from attaching an opportunity to another
    // tenant's contact.
    const contact = await prisma.contact.findFirst({ where: { id: parsed.data.contactId, tenantId: auth.tenantId } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const opportunity = await prisma.opportunity.create({
      data: { tenantId: auth.tenantId, ...parsed.data },
    });

    await writeAuditLog({ tenantId: auth.tenantId, userId: auth.sub, action: "opportunity.create", entityType: "Opportunity", entityId: opportunity.id });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
