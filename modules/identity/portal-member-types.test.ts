import { describe, expect, it } from "vitest";
import {
  fallbackOrganizationAdminMember,
  resolveOrganizationMemberKind,
  resolvePortalMemberFromSession,
  resolvePortalMemberSubtitle,
} from "@/modules/identity/portal-member-types";

describe("resolveOrganizationMemberKind", () => {
  it("maps Neon admin role to organizationAdmin", () => {
    expect(resolveOrganizationMemberKind("admin")).toBe("organizationAdmin");
    expect(resolveOrganizationMemberKind("user")).toBe("client");
    expect(resolveOrganizationMemberKind(null)).toBe("client");
  });
});

describe("resolvePortalMemberSubtitle", () => {
  it("uses organization label for organization admins", () => {
    expect(resolvePortalMemberSubtitle("organizationAdmin")).toBe(
      "Organization",
    );
    expect(resolvePortalMemberSubtitle("client")).toBe("Client");
  });
});

describe("fallbackOrganizationAdminMember", () => {
  it("builds an organization-admin member shell", () => {
    const member = fallbackOrganizationAdminMember("Portal Operator");
    expect(member.context).toBe("organizationAdmin");
    expect(member.role).toBe("admin");
    expect(member.displayName).toBe("Portal Operator");
  });
});

describe("resolvePortalMemberFromSession", () => {
  it("prefers synced member when present", () => {
    const synced = fallbackOrganizationAdminMember("Synced");
    expect(
      resolvePortalMemberFromSession(synced, {
        id: "other",
        email: "other@example.com",
      }),
    ).toBe(synced);
  });

  it("infers organizationAdmin from Neon admin role", () => {
    const member = resolvePortalMemberFromSession(null, {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
    });
    expect(member?.context).toBe("organizationAdmin");
    expect(member?.displayName).toBe("Admin");
  });

  it("returns null without id or email", () => {
    expect(resolvePortalMemberFromSession(null, { id: "user-1" })).toBeNull();
    expect(resolvePortalMemberFromSession(null, undefined)).toBeNull();
  });
});
