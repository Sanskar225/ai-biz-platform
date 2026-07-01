/**
 * Run with: npx prisma db seed
 * (or: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts)
 *
 * This creates enough demo data to make every page look alive for the demo:
 * contacts, opportunities at every pipeline stage, WhatsApp/email/call
 * conversations with AI summaries, tasks, and a proper audit trail.
 * Safe to run multiple times — it clears and re-creates demo data each time.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding demo data...");

  // Upsert the first tenant (the one created by Google OAuth login)
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "DareXAI Demo Business",
        slug: "darexai-demo",
        industry: "B2B SaaS",
        businessGoals: "Close 10 enterprise deals this quarter and reduce churn below 5%",
        productSummary: "AI-powered business automation platform for SMBs",
      },
    });
    console.log("  Created tenant:", tenant.name);
  } else {
    // Update with proper onboarding data so the AI agent has context
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        industry: "B2B SaaS",
        businessGoals: "Close 10 enterprise deals this quarter and reduce churn below 5%",
        productSummary: "AI-powered business automation platform for SMBs",
      },
    });
    console.log("  Using existing tenant:", tenant.name);
  }

  const tenantId = tenant.id;

  // Clear old demo data so seed is idempotent
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.task.deleteMany({ where: { tenantId } });
  await prisma.message.deleteMany({ where: { tenantId } });
  await prisma.conversation.deleteMany({ where: { tenantId } });
  await prisma.opportunity.deleteMany({ where: { tenantId } });
  await prisma.contact.deleteMany({ where: { tenantId } });
  console.log("  Cleared old demo data");

  // --- Contacts ---
  const contacts = await Promise.all([
    prisma.contact.create({ data: { tenantId, name: "Rahul Sharma", phone: "+919876543210", email: "rahul@techcorp.in", company: "TechCorp India", source: "Meta Ads", tags: ["hot-lead", "enterprise"] } }),
    prisma.contact.create({ data: { tenantId, name: "Priya Mehta", phone: "+919823456789", email: "priya@startup.io", company: "StartupIO", source: "Referral", tags: ["warm"] } }),
    prisma.contact.create({ data: { tenantId, name: "Arjun Kapoor", phone: "+919845678901", email: "arjun@logistics.com", company: "FastLogistics", source: "Website", tags: ["new"] } }),
    prisma.contact.create({ data: { tenantId, name: "Acme Corp (Maya)", phone: "+918800112233", email: "maya@acme.com", company: "Acme Corp", source: "Cold Outreach", tags: ["enterprise"] } }),
    prisma.contact.create({ data: { tenantId, name: "Kabir Mehta", phone: "+919911223344", email: "kabir@retailchain.in", company: "RetailChain", source: "Google Ads", tags: ["at-risk"] } }),
  ]);
  console.log(`  Created ${contacts.length} contacts`);

  const [rahul, priya, arjun, acme, kabir] = contacts;

  // --- Opportunities ---
  const opps = await Promise.all([
    prisma.opportunity.create({ data: { tenantId, contactId: rahul.id, title: "TechCorp India — Enterprise License", stage: "NEGOTIATION", value: 320000, aiScore: 91, nextBestAction: "Send revised pricing deck and schedule call this week", nextBestActionReason: "Rahul has reviewed pricing 3 times and requested an invoice address — very high buying signal" } }),
    prisma.opportunity.create({ data: { tenantId, contactId: priya.id, title: "StartupIO — Growth Plan", stage: "PROPOSAL", value: 48000, aiScore: 74, nextBestAction: "Follow up on the proposal sent 3 days ago", nextBestActionReason: "No response since proposal was sent; typical decision window for this size is 5-7 days" } }),
    prisma.opportunity.create({ data: { tenantId, contactId: arjun.id, title: "FastLogistics — Starter Package", stage: "QUALIFIED", value: 24000, aiScore: 82, nextBestAction: "Book a product demo this week", nextBestActionReason: "Score above threshold; demo is next logical step before proposal" } }),
    prisma.opportunity.create({ data: { tenantId, contactId: acme.id, title: "Acme Corp — Platform Integration", stage: "WON", value: 150000, aiScore: 96, nextBestAction: "Schedule onboarding kick-off call", nextBestActionReason: "Deal is closed — move to implementation phase" } }),
    prisma.opportunity.create({ data: { tenantId, contactId: kabir.id, title: "RetailChain — Renewal", stage: "NEW", value: 36000, aiScore: 45, nextBestAction: "Check in on product usage and satisfaction before renewal discussion", nextBestActionReason: "Usage has dropped 40% week-over-week — at-risk before renewal conversation" } }),
  ]);
  console.log(`  Created ${opps.length} opportunities`);

  // --- Tasks ---
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await Promise.all([
    prisma.task.create({ data: { tenantId, contactId: rahul.id, opportunityId: opps[0].id, title: "Send revised pricing deck to Rahul", dueAt: tomorrow, createdByAI: true, notes: "AI suggested this based on repeated pricing page views" } }),
    prisma.task.create({ data: { tenantId, contactId: priya.id, opportunityId: opps[1].id, title: "Follow up on StartupIO proposal", dueAt: tomorrow, createdByAI: false } }),
    prisma.task.create({ data: { tenantId, contactId: arjun.id, opportunityId: opps[2].id, title: "Book product demo with FastLogistics", dueAt: nextWeek, createdByAI: true } }),
    prisma.task.create({ data: { tenantId, contactId: kabir.id, title: "Check RetailChain usage before renewal talk", dueAt: nextWeek, createdByAI: false } }),
  ]);
  console.log("  Created tasks");

  // --- WhatsApp Conversations ---
  const waCon1 = await prisma.conversation.create({
    data: {
      tenantId,
      contactId: rahul.id,
      channel: "WHATSAPP",
      aiSummary: "Rahul has reviewed pricing three times in 24 hours and is asking for a call. Intent is high. Objection: annual vs monthly commitment. Buying signal: requested invoice address.",
      intent: "High",
      sentiment: "POSITIVE",
      recommendedNextAction: "Reply within the hour and lock in a call time — deal is hot.",
      urgency: "2h",
    },
  });
  await prisma.message.createMany({
    data: [
      { tenantId, conversationId: waCon1.id, channel: "WHATSAPP", direction: "INBOUND", body: "Hi Sanu, can we hop on a call tomorrow at 11? I'd like to lock in the annual pricing we discussed.", createdAt: new Date(now.getTime() - 7200000) },
      { tenantId, conversationId: waCon1.id, channel: "WHATSAPP", direction: "OUTBOUND", body: "Absolutely. I'll send a Google Meet invite for 11. Anything specific you'd like me to prep?", aiGenerated: true, createdAt: new Date(now.getTime() - 3600000) },
      { tenantId, conversationId: waCon1.id, channel: "WHATSAPP", direction: "INBOUND", body: "Yes — can you bring the invoice breakdown? We're comparing annual vs monthly for budget approval.", createdAt: new Date(now.getTime() - 1800000) },
      { tenantId, conversationId: waCon1.id, channel: "WHATSAPP", direction: "OUTBOUND", body: "Hi Rahul — confirmed 11 AM tomorrow. I've attached the annual plan 1-pager and noted the invoice address for billing. See you then.", aiGenerated: true, createdAt: new Date(now.getTime() - 900000) },
    ],
  });

  const waCon2 = await prisma.conversation.create({
    data: {
      tenantId,
      contactId: priya.id,
      channel: "WHATSAPP",
      aiSummary: "Priya asked about team pricing and got a link to the proposal 3 days ago. No response since. Sentiment is neutral — no objection, just silence.",
      intent: "Medium",
      sentiment: "NEUTRAL",
      recommendedNextAction: "Send a gentle nudge — ask if they had a chance to review the proposal.",
      urgency: "24h",
    },
  });
  await prisma.message.createMany({
    data: [
      { tenantId, conversationId: waCon2.id, channel: "WHATSAPP", direction: "INBOUND", body: "Hey, what are the team pricing options? We're a 12-person startup.", createdAt: new Date(now.getTime() - 259200000) },
      { tenantId, conversationId: waCon2.id, channel: "WHATSAPP", direction: "OUTBOUND", body: "Hi Priya! Great to hear from you. For a 12-person team the Growth Plan at ₹4,000/user/year works best. Sending you the full proposal now.", createdAt: new Date(now.getTime() - 259100000) },
      { tenantId, conversationId: waCon2.id, channel: "WHATSAPP", direction: "INBOUND", body: "Thanks, will think and revert.", createdAt: new Date(now.getTime() - 258900000) },
    ],
  });

  const waCon3 = await prisma.conversation.create({
    data: {
      tenantId,
      contactId: kabir.id,
      channel: "WHATSAPP",
      aiSummary: "Kabir's team hasn't logged in for 3 weeks. He raised a support complaint last week that wasn't resolved. High churn risk.",
      intent: "Low",
      sentiment: "NEGATIVE",
      recommendedNextAction: "Escalate to account manager and schedule a re-engagement call immediately.",
      urgency: "48h",
    },
  });
  await prisma.message.createMany({
    data: [
      { tenantId, conversationId: waCon3.id, channel: "WHATSAPP", direction: "INBOUND", body: "Your platform has been down 3 times this month. This is unacceptable for our operations.", createdAt: new Date(now.getTime() - 604800000) },
      { tenantId, conversationId: waCon3.id, channel: "WHATSAPP", direction: "OUTBOUND", body: "Hi Kabir, I'm really sorry to hear this. Let me escalate to our tech team right now and get back to you within the hour.", createdAt: new Date(now.getTime() - 604700000) },
      { tenantId, conversationId: waCon3.id, channel: "WHATSAPP", direction: "INBOUND", body: "Voicemail. 38s transcript ready.", createdAt: new Date(now.getTime() - 86400000) },
    ],
  });

  // --- Email Conversation ---
  const emailCon = await prisma.conversation.create({
    data: {
      tenantId,
      contactId: acme.id,
      channel: "EMAIL",
      externalThreadId: "Re: Acme Corp Platform Integration — SOW",
      aiSummary: "Sharing the updated Statement of Work for legal review. Deal is closed — Maya is confirming implementation timeline.",
      intent: "High",
      sentiment: "POSITIVE",
      recommendedNextAction: "Confirm kick-off date and assign an implementation manager.",
      urgency: "low",
    },
  });
  await prisma.message.createMany({
    data: [
      { tenantId, conversationId: emailCon.id, channel: "EMAIL", direction: "INBOUND", body: "Subject: Re: Acme Corp Platform Integration — SOW\n\nHi team, please find the signed SOW attached. We are ready to proceed. Can we schedule the kick-off for next Thursday?", createdAt: new Date(now.getTime() - 172800000) },
      { tenantId, conversationId: emailCon.id, channel: "EMAIL", direction: "OUTBOUND", body: "Subject: Re: Acme Corp Platform Integration — SOW\n\nHi Maya, Congratulations — welcome to the platform! Confirming kick-off for next Thursday at 3 PM IST. I'll send the calendar invite and onboarding checklist shortly.", aiGenerated: false, createdAt: new Date(now.getTime() - 86400000) },
    ],
  });

  // --- Call Log Conversation ---
  const callCon = await prisma.conversation.create({
    data: {
      tenantId,
      contactId: arjun.id,
      channel: "CALL",
      aiSummary: "Discovery call with Arjun from FastLogistics. He manages 50 delivery agents and needs route optimization + WhatsApp dispatch. Budget is confirmed. Next step is a product demo.",
      intent: "High",
      sentiment: "POSITIVE",
      recommendedNextAction: "Send demo calendar link and a 1-pager on the dispatch automation module.",
      urgency: "48h",
    },
  });
  await prisma.message.create({
    data: {
      tenantId,
      conversationId: callCon.id,
      channel: "CALL",
      direction: "OUTBOUND",
      body: "Discovery call transcript:\n\nSanu: Tell me about your current dispatch process.\nArjun: We have 50 drivers and coordinate everything on WhatsApp groups right now. It's chaos. I need automated route assignment and proof-of-delivery.\nSanu: Our platform handles exactly that — automated WhatsApp dispatch + real-time tracking. Budget?\nArjun: We have ₹2L allocated for this quarter.\nSanu: Perfect. Let me set up a demo for you this week.\nArjun: Yes please — Thursday works.",
      metadata: { durationSeconds: 847 },
    },
  });

  // --- Audit Logs ---
  await prisma.auditLog.createMany({
    data: [
      { tenantId, action: "auth.login", createdAt: new Date(now.getTime() - 3600000) },
      { tenantId, action: "workflow.lead.created", entityType: "Contact", entityId: arjun.id, createdAt: new Date(now.getTime() - 7200000) },
      { tenantId, action: "workflow.lead.qualified", entityType: "Opportunity", entityId: opps[2].id, metadata: { score: 82, reason: "B2B lead with confirmed budget and clear pain point" }, createdAt: new Date(now.getTime() - 7199000) },
      { tenantId, action: "workflow.lead.whatsapp_sent", entityType: "Opportunity", entityId: opps[2].id, metadata: { sandbox: true }, createdAt: new Date(now.getTime() - 7198000) },
      { tenantId, action: "workflow.lead.task_created", entityType: "Task", createdAt: new Date(now.getTime() - 7197000) },
      { tenantId, action: "workflow.lead.completed", entityType: "Opportunity", entityId: opps[2].id, metadata: { score: 82, outcome: "qualified_and_followed_up" }, createdAt: new Date(now.getTime() - 7196000) },
      { tenantId, action: "ai.tool.send_whatsapp", entityType: "Message", metadata: { sandbox: true }, createdAt: new Date(now.getTime() - 1800000) },
      { tenantId, action: "opportunity.update", entityType: "Opportunity", entityId: opps[3].id, metadata: { stage: "WON" }, createdAt: new Date(now.getTime() - 172800000) },
    ],
  });

  console.log("  Created conversations, messages, audit logs");
  console.log("");
  console.log("✅  Seed complete! Summary:");
  console.log(`   • ${contacts.length} contacts`);
  console.log(`   • ${opps.length} opportunities (across all pipeline stages)`);
  console.log("   • 4 tasks");
  console.log("   • 3 WhatsApp conversations + 1 email + 1 call log");
  console.log("   • 8 audit log entries");
  console.log("");
  console.log("   Run 'npm run dev' and open http://localhost:3000");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
