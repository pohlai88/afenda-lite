import { describe, expect, it } from "vitest";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_ROLE_TEMPLATES,
  isPlatformPermissionCode,
  isPlatformSensitivePermission,
} from "@/modules/identity/domain/platform-rbac-catalog";
import {
  createPlatformRoleSchema,
  permissionCodeSchema,
} from "@/modules/identity/schemas/platform-rbac";

describe("platform-rbac-catalog", () => {
  it("includes required v1 codes", () => {
    const codes = PLATFORM_PERMISSION_CATALOG.map((p) => p.code);
    expect(codes).toContain("org.users.manage");
    expect(codes).toContain("org.roles.manage");
    expect(codes).toContain("declarations.manage");
    expect(codes).toContain("declarations.read");
    expect(codes).toContain("clients.invite");
    expect(codes).toContain("account.self");
  });

  it("marks org.roles.manage as sensitive", () => {
    expect(isPlatformSensitivePermission("org.roles.manage")).toBe(true);
    expect(isPlatformSensitivePermission("declarations.read")).toBe(false);
  });

  it("rejects unknown codes", () => {
    expect(isPlatformPermissionCode("event.create")).toBe(false);
  });

  it("seeds Org Admin with all catalog codes", () => {
    const admin = PLATFORM_ROLE_TEMPLATES.find((t) => t.templateKey === "org_admin");
    expect(admin).toBeDefined();
    expect(admin!.permissionCodes).toHaveLength(PLATFORM_PERMISSION_CATALOG.length);
  });
});

describe("platform-rbac schemas", () => {
  it("parses create role input", () => {
    const parsed = createPlatformRoleSchema.safeParse({
      name: "Custom",
      permissionCodes: ["declarations.read", "account.self"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown permission codes", () => {
    const parsed = permissionCodeSchema.safeParse("fft.event.create");
    expect(parsed.success).toBe(false);
  });
});
