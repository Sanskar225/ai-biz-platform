import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext();
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.task.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const task = await prisma.task.update({ where: { id }, data: { completedAt: body.completedAt ? new Date(body.completedAt) : undefined } });
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
