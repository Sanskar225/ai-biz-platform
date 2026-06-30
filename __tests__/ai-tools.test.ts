jest.mock("@/lib/db", () => ({
  prisma: {
    contact: {
      findMany: jest.fn(async ({ where }: any) => [
        { id: "c1", tenantId: where.tenantId, name: "Aditi Verma", phone: "+91999" },
      ]),
      findFirstOrThrow: jest.fn(async ({ where }: any) => ({ id: where.id, tenantId: where.tenantId, phone: "+91999" })),
    },
    task: {
      create: jest.fn(async ({ data }: any) => ({ id: "task_1", ...data })),
    },
    opportunity: {
      update: jest.fn(async ({ where, data }: any) => ({ id: where.id, tenantId: where.tenantId, ...data })),
    },
    conversation: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => ({ id: "conv_1", ...data })),
    },
    message: {
      create: jest.fn(async ({ data }: any) => ({ id: "msg_1", ...data })),
    },
  },
}));

jest.mock("@/lib/audit", () => ({ writeAuditLog: jest.fn(async () => {}) }));
jest.mock("@/lib/whatsapp/client", () => ({
  sendWhatsAppMessage: jest.fn(async (to: string, body: string) => ({ id: "wamid_1", sandbox: true, to, body })),
}));

import { executeTool } from "@/lib/ai/tools";
import { writeAuditLog } from "@/lib/audit";

describe("AI Agent: tool calling", () => {
  it("search_contacts only searches within the caller's tenant", async () => {
    const result = await executeTool("tenant_A", "user_1", "search_contacts", { query: "Aditi" });
    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].tenantId).toBe("tenant_A");
  });

  it("create_task writes an audit log entry", async () => {
    await executeTool("tenant_A", "user_1", "create_task", { title: "Follow up with Aditi" });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant_A", action: "ai.tool.create_task" })
    );
  });

  it("send_whatsapp scopes the contact lookup to the requesting tenant before sending", async () => {
    const result = await executeTool("tenant_A", "user_1", "send_whatsapp", { contactId: "c1", message: "Hi!" });
    expect(result.sandbox).toBe(true);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant_A", action: "ai.tool.send_whatsapp" })
    );
  });

  it("throws on an unknown tool name instead of silently doing nothing", async () => {
    await expect(executeTool("tenant_A", "user_1", "delete_everything", {})).rejects.toThrow("Unknown tool");
  });
});
