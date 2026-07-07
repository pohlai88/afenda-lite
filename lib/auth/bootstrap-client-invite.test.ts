import { describe, expect, it } from "vitest";
import {
  resolveBootstrapEmail,
  resolveMetadataInvitationId,
} from "@/lib/auth/bootstrap-client-invite";

describe("resolveMetadataInvitationId", () => {
  it("returns metadata invitation ids", () => {
    expect(
      resolveMetadataInvitationId({ invitation_id: "invite-1" }),
    ).toBe("invite-1");
  });

  it("ignores empty or non-string metadata values", () => {
    expect(resolveMetadataInvitationId({ invitation_id: "" })).toBeNull();
    expect(resolveMetadataInvitationId({ invitation_id: 42 })).toBeNull();
    expect(resolveMetadataInvitationId(null)).toBeNull();
  });
});

describe("resolveBootstrapEmail", () => {
  it("trims email values", () => {
    expect(resolveBootstrapEmail("  client@example.com  ")).toBe(
      "client@example.com",
    );
  });

  it("returns null for empty email", () => {
    expect(resolveBootstrapEmail("   ")).toBeNull();
    expect(resolveBootstrapEmail(null)).toBeNull();
  });
});
