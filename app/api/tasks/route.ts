import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const tasks = await prisma.task.findMany({
      where: { tenantId: auth.tenantId },
      include: { contact: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body = await req.json();
    const schema = z.object({ title: z.string().min(1).max(200), notes: z.string().optional(), dueAt: z.string().datetime().optional() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const task = await prisma.task.create({ data: { tenantId: auth.tenantId, ...parsed.data } });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
