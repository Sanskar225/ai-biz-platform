/**
 * WhatsApp send client.
 *
 * USE_REAL_WHATSAPP=false (default): "sandbox" mode. We don't call Meta;
 * we just synthesize a fake message id and return immediately. This
 * keeps the AI agent, CRM and unified inbox fully demoable without
 * needing a verified Meta Business account.
 *
 * USE_REAL_WHATSAPP=true: calls the real Meta Cloud API. Flipping this
 * flag plus filling WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN is
 * the ONLY change needed to go live — no code changes, per the
 * challenge's requirement.
 */
export async function sendWhatsAppMessage(toPhone: string, body: string) {
  const useReal = process.env.USE_REAL_WHATSAPP === "true";

  if (!useReal) {
    return {
      id: `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sandbox: true,
      to: toPhone,
      body,
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp real mode enabled but credentials are missing");
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) throw new Error(`WhatsApp send failed: ${await res.text()}`);
  const data = await res.json();
  return { id: data.messages?.[0]?.id, sandbox: false, to: toPhone, body };
}
