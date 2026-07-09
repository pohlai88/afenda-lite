import { describe, expect, it } from "vitest";
import {
  pickDisplayName,
  resolvePortalMemberContext,
  resolvePortalMemberFromSession,
  resolvePortalMemberSubtitle,
} from "@/lib/portal-member-types";

describe("portal-member-types", () => {
  it("infers operator context from admin role", () => {
    expect(resolvePortalMemberContext("admin")).toBe("operator");
    expect(resolvePortalMemberContext("user")).toBe("client");
    expect(resolvePortalMemberContext(null)).toBe("client");
  });

  it("labels subtitles by persona", () => {
    expect(resolvePortalMemberSubtitle("operator")).toBe("Organization");
    expect(resolvePortalMemberSubtitle("client")).toBe("Client portal");
  });

  it("prefers server-synced member over session fallback", () => {
    const synced = {
      userId: "synced",
      email: "synced@example.com",
      authName: "Synced User",
      displayName: "Synced User",
      subtitle: "Entity",
      role: "user",
      context: "client" as const,
      isPreviewSession: false,
      profile: null,
    };

    expect(
      resolvePortalMemberFromSession(synced, {
        id: "other",
        email: "other@example.com",
        role: "admin",
      }),
    ).toBe(synced);
  });

  it("builds fallback member from auth session user", () => {
    const member = resolvePortalMemberFromSession(null, {
      id: "user-1",
      email: "client@example.com",
      name: "Client User",
      role: "user",
    });

    expect(member).toEqual({
      userId: "user-1",
      email: "client@example.com",
      authName: "Client User",
      displayName: pickDisplayName({
        authName: "Client User",
        email: "client@example.com",
      }),
      subtitle: "Client portal",
      role: "user",
      context: "client",
      isPreviewSession: false,
      profile: null,
    });
  });

  it("returns null when session user is incomplete", () => {
    expect(resolvePortalMemberFromSession(null, { id: "user-1" })).toBeNull();
    expect(resolvePortalMemberFromSession(null, undefined)).toBeNull();
  });
});
