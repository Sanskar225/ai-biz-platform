import jwt from "jsonwebtoken";

process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

// lib/auth/tokens.ts imports the Prisma client for refresh-token
// persistence; it isn't needed for these pure JWT sign/verify tests,
// so it's mocked out to keep this suite isolated from the database.
jest.mock("@/lib/db", () => ({ prisma: {} }));

// require (not import) so the module body — which reads ACCESS_SECRET
// from process.env at load time — runs AFTER the env vars above are
// set. A top-level `import` would be hoisted above those assignments.
const { signAccessToken, verifyAccessToken } = require("@/lib/auth/tokens");

describe("Authentication: access tokens", () => {
  it("signs a token that round-trips through verification with the correct claims", () => {
    const token = signAccessToken({ sub: "user_1", tenantId: "tenant_1", role: "OWNER" });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe("user_1");
    expect(decoded.tenantId).toBe("tenant_1");
    expect(decoded.role).toBe("OWNER");
  });

  it("rejects a token signed with a different secret (tamper/forgery protection)", () => {
    const forged = jwt.sign({ sub: "attacker", tenantId: "victim_tenant", role: "OWNER" }, "wrong-secret");
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ sub: "u", tenantId: "t", role: "OWNER" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: -10 });
    expect(() => verifyAccessToken(expired)).toThrow();
  });
});
