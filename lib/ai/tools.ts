import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";

/**
 * Every tool function takes `tenantId` as its FIRST argument and it is
 * never sourced from the model's output — it's injected by the route
 * handler from the verified JWT. This is the same isolation guarantee
 * as the rest of the app: the AI can only ever act within the tenant
 * of the user who is chatting with it.
 */

export const toolDeclarations = [
  {
    name: "search_contacts",
    description: "Find contacts/customers by name, phone, or email substring.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Name, phone, or email to search for" } },
      required: ["query"],
    },
  },
  {
    name: "create_task",
    description: "Create a reminder/follow-up task, optionally linked to a contact or opportunity.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        contactId: { type: "string", description: "Optional contact id from search_contacts" },
        opportunityId: { type: "string" },
        dueInHours: { type: "number", description: "Hours from now the task is due" },
        notes: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_opportunity",
    description: "Update an opportunity's stage, value, or next-best-action.",
    parameters: {
      type: "object",
      properties: {
        opportunityId: { type: "string" },
        stage: { type: "string", enum: ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] },
        nextBestAction: { type: "string" },
        nextBestActionReason: { type: "string" },
      },
      required: ["opportunityId"],
    },
  },
  {
    name: "send_whatsapp",
    description: "Send a WhatsApp message to a contact.",
    parameters: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        message: { type: "string" },
      },
      required: ["contactId", "message"],
    },
  },
  {
    name: "fetch_business_metrics",
    description: "Retrieve live dashboard KPIs: active opportunities, pipeline value, pending follow-ups, recent activity count.",
    parameters: { type: "object", properties: {} },
  },
];

export async function executeTool(
  tenantId: string,
  userId: string,
  name: string,
  args: Record<string, any>
) {
  switch (name) {
    case "search_contacts": {
      const contacts = await prisma.contact.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: args.query, mode: "insensitive" } },
            { phone: { contains: args.query } },
            { email: { contains: args.query, mode: "insensitive" } },
          ],
        },
        take: 5,
      });
      return { contacts };
    }

    case "create_task": {
      const dueAt = args.dueInHours ? new Date(Date.now() + args.dueInHours * 60 * 60 * 1000) : null;
      const task = await prisma.task.create({
        data: {
          tenantId,
          title: args.title,
          notes: args.notes,
          contactId: args.contactId || undefined,
          opportunityId: args.opportunityId || undefined,
          dueAt,
          createdByAI: true,
        },
      });
      await writeAuditLog({ tenantId, userId, action: "ai.tool.create_task", entityType: "Task", entityId: task.id, metadata: args });
      return { task };
    }

    case "update_opportunity": {
      const opp = await prisma.opportunity.update({
        where: { id: args.opportunityId, tenantId }, // tenantId in the where clause prevents cross-tenant writes
        data: {
          stage: args.stage || undefined,
          nextBestAction: args.nextBestAction || undefined,
          nextBestActionReason: args.nextBestActionReason || undefined,
        },
      });
      await writeAuditLog({ tenantId, userId, action: "ai.tool.update_opportunity", entityType: "Opportunity", entityId: opp.id, metadata: args });
      return { opportunity: opp };
    }

    case "send_whatsapp": {
      const contact = await prisma.contact.findFirstOrThrow({ where: { id: args.contactId, tenantId } });

      let conversation = await prisma.conversation.findFirst({
        where: { tenantId, contactId: contact.id, channel: "WHATSAPP" },
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { tenantId, contactId: contact.id, channel: "WHATSAPP" },
        });
      }

      const result = await sendWhatsAppMessage(contact.phone ?? "", args.message);

      const message = await prisma.message.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          channel: "WHATSAPP",
          direction: "OUTBOUND",
          body: args.message,
          aiGenerated: true,
          externalId: result.id,
          metadata: result as any,
        },
      });

      await writeAuditLog({ tenantId, userId, action: "ai.tool.send_whatsapp", entityType: "Message", entityId: message.id, metadata: { to: contact.phone, sandbox: result.sandbox } });
      return { message, sandbox: result.sandbox };
    }

    case "fetch_business_metrics": {
      const [activeOpps, pipelineAgg, pendingFollowups, recentMessages] = await Promise.all([
        prisma.opportunity.count({ where: { tenantId, stage: { notIn: ["WON", "LOST"] } } }),
        prisma.opportunity.aggregate({ where: { tenantId, stage: { notIn: ["WON", "LOST"] } }, _sum: { value: true } }),
        prisma.task.count({ where: { tenantId, completedAt: null } }),
        prisma.message.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      ]);
      return {
        activeOpportunities: activeOpps,
        pipelineValue: Number(pipelineAgg._sum.value ?? 0),
        pendingFollowups,
        messagesLast7Days: recentMessages,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
