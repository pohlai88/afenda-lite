import { describe, expect, it } from "vitest";
import {
  resolveBootstrapEmail,
  resolveMetadataInvitationId,
} from "@/modules/identity/auth/bootstrap-client-invite";

describe("bootstrapClientAfterAuth helpers", () => {
  it("reads invitation_id from metadata", () => {
    expect(
      resolveMetadataInvitationId({ invitation_id: "inv-1" }),
    ).toBe("inv-1");
    expect(resolveMetadataInvitationId({})).toBeNull();
    expect(resolveMetadataInvitationId(null)).toBeNull();
  });

  it("trims bootstrap email", () => {
    expect(resolveBootstrapEmail("  a@b.com ")).toBe("a@b.com");
    expect(resolveBootstrapEmail("")).toBeNull();
    expect(resolveBootstrapEmail(null)).toBeNull();
  });
});
