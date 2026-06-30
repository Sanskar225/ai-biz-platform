import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";

/**
 * Resend's inbound-email feature delivers incoming mail to this webhook,
 * signed the same way as their outbound event webhooks (svix). This
 * mirrors the WhatsApp webhook in app/api/whatsapp/webhook: verify
 * signature -> resolve tenant/contact -> store message -> async AI
 * enrichment.
 *
 * Setup (real mode): Resend dashboard -> Webhooks -> add this URL,
 * subscribe to "email.received" (or configure an Inbound route if using
 * Resend's inbound parsing), copy the signing secret into
 * RESEND_WEBHOOK_SECRET. In sandbox mode (no secret set) signature
 * verification is skipped so this endpoint is testable locally with a
 * plain curl/Postman POST.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  let payload: any;
  try {
    if (secret) {
      const wh = new Webhook(secret);
      const headers = {
        "svix-id": req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      };
      payload = wh.verify(rawBody, headers);
    } else {
      payload = JSON.parse(rawBody); // sandbox mode: no secret configured yet
    }
  } catch (err) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    // Resend's inbound payload shape: { type: "email.received", data: { from, to, subject, text, html, ... } }
    // Normalize defensively since exact field names vary by provider/version.
    const data = payload.data ?? payload;
    const fromEmail: string = (data.from?.email ?? data.from ?? "").toLowerCase();
    const subject: string = data.subject ?? "(no subject)";
    const text: string = data.text ?? data.html?.replace(/<[^>]+>/g, " ") ?? "(empty email)";

    if (!fromEmail) return NextResponse.json({ ok: true }); // not a message we can route

    let contact = await prisma.contact.findFirst({ where: { email: fromEmail } });
    if (!contact) {
      // Same demo-simplicity tradeoff as the WhatsApp webhook: an
      // unknown sender attaches to the first tenant. Production would
      // map the receiving inbox address -> tenantId instead.
      const tenant = await prisma.tenant.findFirstOrThrow();
      contact = await prisma.contact.create({
        data: { tenantId: tenant.id, name: fromEmail, email: fromEmail, source: "Email" },
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: { tenantId: contact.tenantId, contactId: contact.id, channel: "EMAIL" },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { tenantId: contact.tenantId, contactId: contact.id, channel: "EMAIL", externalThreadId: subject },
      });
    }

    await prisma.message.create({
      data: {
        tenantId: contact.tenantId,
        conversationId: conversation.id,
        channel: "EMAIL",
        direction: "INBOUND",
        body: `Subject: ${subject}\n\n${text}`,
        externalId: data.id ?? data.email_id,
        metadata: payload,
      },
    });

    const { generateConversationInsights } = await import("@/lib/ai/insights");
    generateConversationInsights(conversation.id).catch((e) => console.error("enrich email failed", e));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Email webhook error", err);
    return NextResponse.json({ ok: true }); // ack to avoid retry storms
  }
}
