import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const channel = req.nextUrl.searchParams.get("channel"); // optional filter: WHATSAPP | EMAIL | CALL

    const conversations = await prisma.conversation.findMany({
      where: {
        tenantId: auth.tenantId,
        ...(channel ? { channel: channel as any } : {}),
      },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      conversations: conversations.map((c: (typeof conversations)[number]) => ({
        id: c.id,
        channel: c.channel,
        contactName: c.contact.name,
        contactId: c.contactId,
        lastMessage: c.messages[0]?.body ?? null,
        lastMessageAt: c.messages[0]?.createdAt ?? c.updatedAt,
        aiSummary: c.aiSummary,
        intent: c.intent,
        sentiment: c.sentiment,
        recommendedNextAction: c.recommendedNextAction,
        urgency: c.urgency,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
