import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  businessName: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  businessGoals: z.string().max(1000).optional(),
  productSummary: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const tenant = await prisma.tenant.update({
      where: { id: auth.tenantId },
      data: {
        name: parsed.data.businessName,
        industry: parsed.data.industry,
        businessGoals: parsed.data.businessGoals,
        productSummary: parsed.data.productSummary,
      },
    });

    await writeAuditLog({ tenantId: auth.tenantId, userId: auth.sub, action: "tenant.onboarded" });

    return NextResponse.json({ tenant });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
