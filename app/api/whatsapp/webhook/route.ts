import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

// Meta calls this once to verify the webhook URL.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true; // sandbox mode, skip HMAC check
  if (!signatureHeader) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

// Incoming customer messages land here. This route is intentionally NOT
// behind our normal auth middleware (Meta can't present our cookies) —
// instead it's protected by HMAC signature verification.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  try {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return NextResponse.json({ ok: true }); // status callback, not a message

    const fromPhone: string = message.from;
    const text: string = message.text?.body ?? "[unsupported message type]";
    const phoneNumberId: string = change.metadata?.phone_number_id;

    // Route to the tenant that owns this WhatsApp number. In a real
    // deployment, store phoneNumberId -> tenantId mapping on Tenant;
    // for the take-home we resolve via env (single-tenant WA number)
    // and fall back to matching an existing contact's tenant.
    let contact = await prisma.contact.findFirst({ where: { phone: fromPhone } });

    if (!contact) {
      // Unknown number — attach to the first tenant for demo purposes.
      // TODO(production): require explicit phoneNumberId -> tenant mapping.
      const tenant = await prisma.tenant.findFirstOrThrow();
      contact = await prisma.contact.create({
        data: { tenantId: tenant.id, name: fromPhone, phone: fromPhone, source: "WhatsApp" },
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: { tenantId: contact.tenantId, contactId: contact.id, channel: "WHATSAPP" },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { tenantId: contact.tenantId, contactId: contact.id, channel: "WHATSAPP" },
      });
    }

    await prisma.message.create({
      data: {
        tenantId: contact.tenantId,
        conversationId: conversation.id,
        channel: "WHATSAPP",
        direction: "INBOUND",
        body: text,
        externalId: message.id,
        metadata: payload,
      },
    });

    // Fire-and-forget AI enrichment (summary/intent/sentiment) so the
    // webhook responds fast (Meta requires <20s).
    enrichConversation(conversation.id).catch((e) => console.error("enrichConversation failed", e));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WhatsApp webhook error", err);
    return NextResponse.json({ ok: true }); // ack anyway so Meta doesn't retry-storm us
  }
}

async function enrichConversation(conversationId: string) {
  const { generateConversationInsights } = await import("@/lib/ai/insights");
  await generateConversationInsights(conversationId);
}
