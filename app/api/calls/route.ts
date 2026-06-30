import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  contactId: z.string(),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  durationSeconds: z.number().int().nonnegative().optional(),
  transcriptOrNotes: z.string().min(1).max(5000),
  occurredAt: z.string().datetime().optional(),
});

/**
 * POST /api/calls
 *
 * There's no live VoIP/telephony provider wired into this build, so
 * call logs are entered manually (e.g. right after a sales call) — this
 * is explicitly the "Sandbox acceptable" pattern used elsewhere in the
 * brief, applied to the Call Logs channel. Once entered, the same AI
 * insight pipeline (lib/ai/insights.ts) that powers WhatsApp/Email runs
 * over the transcript/notes, so Call Logs get a real AI Summary, Intent,
 * and Sentiment in the Unified Inbox — not just a static record.
 *
 * Swapping this for a real provider (Twilio, Exotel, etc.) later only
 * means adding a webhook that calls the same insertion + enrichment
 * logic below — the data model and AI pipeline don't change.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    const { contactId, direction, durationSeconds, transcriptOrNotes, occurredAt } = parsed.data;

    const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId: auth.tenantId } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    let conversation = await prisma.conversation.findFirst({
      where: { tenantId: auth.tenantId, contactId, channel: "CALL" },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { tenantId: auth.tenantId, contactId, channel: "CALL" },
      });
    }

    const message = await prisma.message.create({
      data: {
        tenantId: auth.tenantId,
        conversationId: conversation.id,
        channel: "CALL",
        direction,
        body: transcriptOrNotes,
        metadata: { durationSeconds: durationSeconds ?? null },
        createdAt: occurredAt ? new Date(occurredAt) : undefined,
      },
    });

    await writeAuditLog({ tenantId: auth.tenantId, userId: auth.sub, action: "call.logged", entityType: "Message", entityId: message.id, metadata: { durationSeconds } });

    const { generateConversationInsights } = await import("@/lib/ai/insights");
    await generateConversationInsights(conversation.id); // awaited here (unlike webhooks) since this is a direct user action, not a time-sensitive callback

    return NextResponse.json({ message, conversationId: conversation.id });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("call log error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
