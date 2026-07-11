import { describe, expect, it } from "vitest";
import {
  FFT_PERMISSION_CATALOG,
  FFT_ROLE_TEMPLATES,
  isSensitivePermission,
  SENSITIVE_PERMISSION_CODES,
} from "@/modules/fft/domain/rbac-catalog";
import {
  assignmentScopeMatches,
  canPermission,
  collectEffectivePermissionCodes,
  isFftRbacEnabled,
  type FftRoleAssignment,
} from "@/modules/fft/domain/rbac";

describe("rbac-catalog", () => {
  it("marks allocation.override, deposit.manage, role.manage, sync.retry as sensitive", () => {
    expect(isSensitivePermission("allocation.override")).toBe(true);
    expect(isSensitivePermission("deposit.manage")).toBe(true);
    expect(isSensitivePermission("role.manage")).toBe(true);
    expect(isSensitivePermission("sync.retry")).toBe(true);
    expect(isSensitivePermission("order.create")).toBe(false);
    expect(SENSITIVE_PERMISSION_CODES.size).toBe(4);
  });

  it("seeds job titles as templates without requiring role-name enums in guards", () => {
    const keys = FFT_ROLE_TEMPLATES.map((t) => t.templateKey);
    expect(keys).toContain("sales_executive");
    expect(keys).toContain("general_manager");
    expect(FFT_PERMISSION_CATALOG.length).toBeGreaterThan(10);
  });

  it("grants pickup.manage to sales_operations template", () => {
    const ops = FFT_ROLE_TEMPLATES.find(
      (t) => t.templateKey === "sales_operations",
    )!;
    expect(ops.permissionCodes).toContain("pickup.manage");
  });

  it("does not grant allocation.override to sales_executive template", () => {
    const exec = FFT_ROLE_TEMPLATES.find(
      (t) => t.templateKey === "sales_executive",
    )!;
    expect(exec.permissionCodes).not.toContain("allocation.override");
    expect(exec.permissionCodes).not.toContain("role.manage");
  });

  it("G9: business_unit_manager has preview/run but not allocation.override", () => {
    const bu = FFT_ROLE_TEMPLATES.find(
      (t) => t.templateKey === "business_unit_manager",
    )!;
    expect(bu.permissionCodes).toContain("allocation.preview");
    expect(bu.permissionCodes).toContain("allocation.run");
    expect(bu.permissionCodes).not.toContain("allocation.override");
  });
});

describe("assignmentScopeMatches", () => {
  const base = {
    roleId: "r1",
    permissionCodes: ["order.view_own"] as const,
    active: true,
  };

  it("allows platform scope", () => {
    expect(
      assignmentScopeMatches(
        { ...base, scopeType: "platform", scopeId: null },
        "u1",
      ).allowed,
    ).toBe(true);
  });

  it("denies unknown team membership (never broadens)", () => {
    const result = assignmentScopeMatches(
      { ...base, scopeType: "team", scopeId: "team-1" },
      "u1",
      { actorTeamIds: null },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("team_scope_unresolved");
  });

  it("denies empty team membership list", () => {
    expect(
      assignmentScopeMatches(
        { ...base, scopeType: "team", scopeId: "team-1" },
        "u1",
        { actorTeamIds: [] },
      ).reason,
    ).toBe("team_scope_unresolved");
  });

  it("denies unknown bu membership", () => {
    expect(
      assignmentScopeMatches(
        { ...base, scopeType: "bu", scopeId: "bu-1" },
        "u1",
        {},
      ).reason,
    ).toBe("bu_scope_unresolved");
  });

  it("allows team when actor is member", () => {
    expect(
      assignmentScopeMatches(
        { ...base, scopeType: "team", scopeId: "team-1" },
        "u1",
        { actorTeamIds: ["team-1"] },
      ).allowed,
    ).toBe(true);
  });

  it("allows own only for resource owner", () => {
    expect(
      assignmentScopeMatches(
        { ...base, scopeType: "own", scopeId: null },
        "u1",
        { resourceOwnerUserId: "u1" },
      ).allowed,
    ).toBe(true);
    expect(
      assignmentScopeMatches(
        { ...base, scopeType: "own", scopeId: null },
        "u1",
        { resourceOwnerUserId: "u2" },
      ).allowed,
    ).toBe(false);
  });
});

describe("canPermission", () => {
  const salesOwn: FftRoleAssignment = {
    roleId: "r-sales",
    scopeType: "own",
    scopeId: null,
    permissionCodes: ["order.create", "order.view_own"],
    active: true,
  };

  it("allows order.view_own for own resource", () => {
    expect(
      canPermission("u1", "order.view_own", [salesOwn], {
        resourceOwnerUserId: "u1",
      }).allowed,
    ).toBe(true);
  });

  it("denies missing sensitive permission with distinct reason", () => {
    const result = canPermission("u1", "role.manage", [salesOwn], {
      resourceOwnerUserId: "u1",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing_sensitive_permission");
  });

  it("collects effective codes only from matching scopes", () => {
    const codes = collectEffectivePermissionCodes(
      "u1",
      [salesOwn],
      { resourceOwnerUserId: "u2" },
    );
    expect(codes.size).toBe(0);
  });
});

describe("isFftRbacEnabled", () => {
  it("defaults to false (Phase 1 path)", () => {
    expect(isFftRbacEnabled({})).toBe(false);
    expect(isFftRbacEnabled({ FFT_RBAC_ENABLED: "false" })).toBe(
      false,
    );
  });

  it("enables only when exactly true", () => {
    expect(isFftRbacEnabled({ FFT_RBAC_ENABLED: "true" })).toBe(
      true,
    );
  });
});
