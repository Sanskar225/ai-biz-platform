import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  company: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const q = req.nextUrl.searchParams.get("q");

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: auth.tenantId, // <-- the tenant isolation boundary
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ contacts });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body = await req.json();
    const parsed = createContactSchema.safeParse(body); // input validation requirement
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: { tenantId: auth.tenantId, ...parsed.data },
    });

    await writeAuditLog({ tenantId: auth.tenantId, userId: auth.sub, action: "contact.create", entityType: "Contact", entityId: contact.id });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
