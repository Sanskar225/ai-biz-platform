/**
 * Email send client, mirroring lib/whatsapp/client.ts.
 *
 * USE_REAL_EMAIL=false (default): sandbox mode — logs and returns a fake
 * id without calling Resend. Lets the Unified Inbox demo work without a
 * verified sending domain.
 *
 * USE_REAL_EMAIL=true + RESEND_API_KEY + RESEND_FROM_EMAIL set: sends
 * through Resend's API. Flipping the flag is the only change needed.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  const useReal = process.env.USE_REAL_EMAIL === "true";

  if (!useReal) {
    return {
      id: `sandbox_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sandbox: true,
      to,
      subject,
      body,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email real mode enabled but RESEND_API_KEY/RESEND_FROM_EMAIL are missing");

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, subject, text: body });

  if (result.error) throw new Error(`Resend send failed: ${result.error.message}`);
  return { id: result.data?.id, sandbox: false, to, subject, body };
}
