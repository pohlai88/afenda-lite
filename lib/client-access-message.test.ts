import { describe, expect, it } from "vitest";
import { buildClientAccessMessage } from "@/lib/client-access-message";

describe("buildClientAccessMessage", () => {
  it("builds Neon invite copy without a temporary password", () => {
    const message = buildClientAccessMessage({
      portalUrl: "https://example.com/client/login",
      clientEmail: "client@example.com",
    });

    expect(message).toContain("https://example.com/client/login");
    expect(message).toContain("client@example.com");
    expect(message).toMatch(/organization invitation email/i);
    expect(message).not.toMatch(/temporary password/i);
  });
});
