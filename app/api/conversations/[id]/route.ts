import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { sendEmail } from "@/lib/email/client";
import { writeAuditLog } from "@/lib/audit";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext();
    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ conversation });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/conversations/:id
 * Body: { mode: "ai_draft" } -> generates a suggested reply, doesn't send
 * Body: { mode: "send", body: string } -> sends a (possibly edited) reply
 * This backs the "Reply for me" button in the unified inbox UI.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext();
    const { id } = await params;
    const body = await req.json();

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: { contact: true, messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.mode === "ai_draft") {
      const transcript = conversation.messages
        .map((m: (typeof conversation.messages)[number]) => `${m.direction === "INBOUND" ? conversation.contact.name : "Business"}: ${m.body}`)
        .join("\n");
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash" });
      const result = await model.generateContent(
        `Based on this conversation, draft a short, professional, helpful reply on behalf of the business. No markdown, no emojis, under 60 words.\n\n${transcript}`
      );
      return NextResponse.json({ draft: result.response.text().trim() });
    }

    if (body.mode === "send") {
      if (conversation.channel === "CALL") {
        return NextResponse.json({ error: "Calls aren't a send-able channel — log a new call instead" }, { status: 400 });
      }

      let result: { id?: string; sandbox: boolean };
      if (conversation.channel === "WHATSAPP") {
        result = await sendWhatsAppMessage(conversation.contact.phone ?? "", body.body);
      } else {
        const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });
        result = await sendEmail(conversation.contact.email ?? "", body.subject ?? `Re: ${tenant.name}`, body.body);
      }

      const message = await prisma.message.create({
        data: {
          tenantId: auth.tenantId,
          conversationId: conversation.id,
          channel: conversation.channel,
          direction: "OUTBOUND",
          body: body.body,
          aiGenerated: !!body.aiGenerated,
          externalId: result.id,
          metadata: result as any,
        },
      });
      await writeAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        action: "conversation.reply_sent",
        entityType: "Message",
        entityId: message.id,
        metadata: { sandbox: result.sandbox },
      });

      // Refresh AI insights now that the timeline changed.
      const { generateConversationInsights } = await import("@/lib/ai/insights");
      generateConversationInsights(conversation.id).catch(() => {});

      return NextResponse.json({ message });
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
