import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Runs after every inbound message to (re)compute the unified-inbox
 * fields: aiSummary, intent, sentiment, recommendedNextAction, urgency.
 * This is what powers "AI Summary, Sentiment and Intent Detection" in
 * the Unified Inbox requirement.
 */
export async function generateConversationInsights(conversationId: string) {
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  const transcript = conversation.messages
    .slice()
    .reverse()
    .map((m: (typeof conversation.messages)[number]) => `${m.direction === "INBOUND" ? conversation.contact.name : "Business"}: ${m.body}`)
    .join("\n");

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You are analyzing a business conversation with a customer. Given this transcript, return ONLY a JSON object with keys:
summary (1-2 sentence summary), intent ("High"|"Medium"|"Low"), sentiment ("POSITIVE"|"NEUTRAL"|"NEGATIVE"), objection (short phrase or null), recommendedNextAction (one short actionable sentence), urgency (e.g. "24h", "48h", "low").

Transcript:
${transcript}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { summary: text.slice(0, 280), intent: "Medium", sentiment: "NEUTRAL", recommendedNextAction: null, urgency: null };
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      aiSummary: parsed.summary,
      intent: parsed.intent,
      sentiment: parsed.sentiment,
      recommendedNextAction: parsed.recommendedNextAction,
      urgency: parsed.urgency,
    },
  });

  return parsed;
}
