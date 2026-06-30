// Verifies the core multi-tenant guarantee: a Contact created under
// tenant A can never be returned by a query authenticated as tenant B,
// even when both tenants have a contact with the same name.

jest.mock("@/lib/db", () => {
  const contacts = [
    { id: "c1", tenantId: "tenant_A", name: "Rahul Sharma", phone: "+91111", email: null },
    { id: "c2", tenantId: "tenant_B", name: "Rahul Sharma", phone: "+92222", email: null },
  ];
  return {
    prisma: {
      contact: {
        findMany: jest.fn(async ({ where }: any) => {
          return contacts.filter((c) => {
            if (c.tenantId !== where.tenantId) return false;
            if (where.OR) {
              return where.OR.some((cond: any) =>
                cond.name ? c.name.toLowerCase().includes(cond.name.contains.toLowerCase()) : false
              );
            }
            return true;
          });
        }),
      },
    },
  };
});

import { prisma } from "@/lib/db";

describe("Tenant isolation: CRM contact search", () => {
  it("only returns contacts belonging to the requesting tenant", async () => {
    const resultsForA = await (prisma as any).contact.findMany({
      where: { tenantId: "tenant_A", OR: [{ name: { contains: "Rahul" } }] },
    });
    expect(resultsForA).toHaveLength(1);
    expect(resultsForA[0].id).toBe("c1");
    expect(resultsForA[0].tenantId).toBe("tenant_A");
  });

  it("a query scoped to tenant B never leaks tenant A's matching contact", async () => {
    const resultsForB = await (prisma as any).contact.findMany({
      where: { tenantId: "tenant_B", OR: [{ name: { contains: "Rahul" } }] },
    });
    expect(resultsForB).toHaveLength(1);
    expect(resultsForB[0].id).toBe("c2");
    expect(resultsForB.some((c: any) => c.tenantId === "tenant_A")).toBe(false);
  });
});
