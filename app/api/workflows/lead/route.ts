import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthContext, UnauthorizedError } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const leadSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  company: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(), // free-text lead context the AI qualifies against
});

/**
 * POST /api/workflows/lead
 *
 * Implements the required workflow:
 *   New Lead -> AI Qualification -> Score > 80 -> Send WhatsApp
 *   -> Create Follow-up Task -> Record Audit Log
 *
 * Every step writes an audit log row, including the qualification
 * itself and the branch decision, so the full automation trail is
 * inspectable afterwards (GET this same route to replay the trail).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body = await req.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const lead = parsed.data;
    const tenantId = auth.tenantId;

    // Step 1: New Lead
    const contact = await prisma.contact.create({
      data: { tenantId, name: lead.name, phone: lead.phone, email: lead.email, company: lead.company, source: lead.source ?? "Workflow" },
    });
    await writeAuditLog({ tenantId, userId: auth.sub, action: "workflow.lead.created", entityType: "Contact", entityId: contact.id });

    // Step 2: AI Qualification
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });
    const qualPrompt = `Score this sales lead from 0-100 on likelihood to close, based on the info given. Return ONLY JSON: {"score": number, "reason": string}.
Lead: name=${lead.name}, company=${lead.company ?? "unknown"}, source=${lead.source ?? "unknown"}, notes=${lead.notes ?? "none"}`;
    const qualResult = await model.generateContent(qualPrompt);
    let qualification: { score: number; reason: string };
    try {
      qualification = JSON.parse(qualResult.response.text());
    } catch {
      qualification = { score: 50, reason: "AI response could not be parsed; defaulted to neutral score." };
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        tenantId,
        contactId: contact.id,
        title: `${lead.company ?? lead.name} — inbound lead`,
        stage: "NEW",
        aiScore: qualification.score,
        nextBestActionReason: qualification.reason,
      },
    });

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      action: "workflow.lead.qualified",
      entityType: "Opportunity",
      entityId: opportunity.id,
      metadata: qualification,
    });

    // Step 3: Branch on score
    const QUALIFY_THRESHOLD = 80;
    if (qualification.score <= QUALIFY_THRESHOLD) {
      await writeAuditLog({
        tenantId,
        userId: auth.sub,
        action: "workflow.lead.below_threshold",
        entityType: "Opportunity",
        entityId: opportunity.id,
        metadata: { score: qualification.score, threshold: QUALIFY_THRESHOLD },
      });
      return NextResponse.json({
        contact,
        opportunity,
        qualification,
        outcome: "below_threshold",
        message: `Lead scored ${qualification.score} (threshold ${QUALIFY_THRESHOLD}). No auto follow-up sent; added to CRM for manual review.`,
      });
    }

    await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: "QUALIFIED" } });

    // Step 4: Send WhatsApp follow-up (AI-generated message)
    const msgModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash" });
    const msgResult = await msgModel.generateContent(
      `Write a brief, warm, professional WhatsApp follow-up message (under 40 words) to a new lead named ${lead.name}${lead.company ? ` from ${lead.company}` : ""} who just inquired about our business. No emojis, no markdown.`
    );
    const followupText = msgResult.response.text().trim();

    let conversation = await prisma.conversation.create({ data: { tenantId, contactId: contact.id, channel: "WHATSAPP" } });
    const sendResult = await sendWhatsAppMessage(lead.phone ?? "", followupText);
    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        body: followupText,
        aiGenerated: true,
        externalId: sendResult.id,
        metadata: sendResult as any,
      },
    });
    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      action: "workflow.lead.whatsapp_sent",
      entityType: "Message",
      entityId: message.id,
      metadata: { sandbox: sendResult.sandbox },
    });

    // Step 5: Create follow-up task
    const task = await prisma.task.create({
      data: {
        tenantId,
        contactId: contact.id,
        opportunityId: opportunity.id,
        title: `Follow up with ${lead.name} (high-score lead)`,
        notes: `AI score: ${qualification.score}/100. ${qualification.reason}`,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdByAI: true,
      },
    });
    await writeAuditLog({ tenantId, userId: auth.sub, action: "workflow.lead.task_created", entityType: "Task", entityId: task.id });

    // Step 6: Final audit record summarizing the whole run
    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      action: "workflow.lead.completed",
      entityType: "Opportunity",
      entityId: opportunity.id,
      metadata: { score: qualification.score, outcome: "qualified_and_followed_up" },
    });

    return NextResponse.json({
      contact,
      opportunity,
      qualification,
      message,
      task,
      outcome: "qualified",
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("workflow error", err);
    return NextResponse.json({ error: "Workflow failed" }, { status: 500 });
  }
}

// GET replays the audit trail for a given opportunity so the demo can
// show "here's exactly what the automation did and why."
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const opportunityId = req.nextUrl.searchParams.get("opportunityId");
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: auth.tenantId, ...(opportunityId ? { entityId: opportunityId } : { action: { startsWith: "workflow.lead." } }) },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ logs });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
