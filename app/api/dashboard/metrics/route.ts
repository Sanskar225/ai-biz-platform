import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const tenantId = auth.tenantId;

    const [activeOpportunities, pipelineAgg, pendingFollowups, recentContacts, aiAlerts] = await Promise.all([
      prisma.opportunity.count({ where: { tenantId, stage: { notIn: ["WON", "LOST"] } } }),
      prisma.opportunity.aggregate({ where: { tenantId, stage: { notIn: ["WON", "LOST"] } }, _sum: { value: true } }),
      prisma.task.count({ where: { tenantId, completedAt: null } }),
      prisma.contact.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.conversation.findMany({
        where: { tenantId, sentiment: "NEGATIVE" },
        select: { id: true, aiSummary: true, contact: { select: { name: true } } },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      activeOpportunities,
      revenuePipeline: Number(pipelineAgg._sum.value ?? 0),
      pendingFollowups,
      newCustomersThisWeek: recentContacts,
      aiAlerts: aiAlerts.map((c: (typeof aiAlerts)[number]) => ({ contact: c.contact.name, summary: c.aiSummary })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
