import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSensitivePermission } from "@/modules/fft/domain/rbac-catalog";

type AuditRow = {
  action: string;
  permissionCode: string | null;
  reason: string | null;
};

const mocks = vi.hoisted(() => {
  const auditRows: AuditRow[] = [];
  let roleCounter = 0;

  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes("fft_rbac_audit")) {
      auditRows.push({
        action: params?.[0] as string,
        permissionCode: (params?.[5] as string | null) ?? null,
        reason: (params?.[8] as string | null) ?? null,
      });
      return { rows: [] };
    }

    if (
      sql.includes("INSERT INTO fft_role") &&
      sql.includes("RETURNING id")
    ) {
      roleCounter += 1;
      return { rows: [{ id: `role-${roleCounter}` }] };
    }

    if (sql.includes("SELECT permission_code FROM fft_role_permission")) {
      return { rows: [] };
    }

    return { rows: [] };
  });

  return { query, auditRows, resetRoleCounter: () => {
    roleCounter = 0;
  } };
});

vi.mock("@/modules/platform/db", () => ({
  pool: {
    query: mocks.query,
  },
}));

import {
  createCustomRole,
  seedFftRbacCatalog,
  setRolePermissions,
} from "@/modules/fft/domain/store";

describe("fft_rbac_audit writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auditRows.length = 0;
    mocks.resetRoleCounter();
  });

  it("records audit rows when seeding sensitive template grants", async () => {
    await seedFftRbacCatalog("actor-seed");

    const sensitiveGrants = mocks.auditRows.filter(
      (row) => row.action === "role.permission_grant",
    );
    expect(sensitiveGrants.length).toBeGreaterThan(0);
    expect(
      sensitiveGrants.some((row) => row.permissionCode === "role.manage"),
    ).toBe(true);
    expect(
      sensitiveGrants.some((row) => row.permissionCode === "deposit.manage"),
    ).toBe(true);
    expect(
      sensitiveGrants.every((row) => row.reason === "template_seed"),
    ).toBe(true);
  });

  it("records audit when updating a role with a newly granted sensitive permission", async () => {
    await setRolePermissions({
      roleId: "role-custom",
      permissionCodes: ["event.view", "allocation.override"],
      actorId: "actor-1",
    });

    const sensitiveGrant = mocks.auditRows.find(
      (row) =>
        row.action === "role.permission_grant" &&
        row.permissionCode === "allocation.override",
    );
    expect(sensitiveGrant).toBeDefined();
    expect(sensitiveGrant?.reason).toBe("role_permission_update");

    expect(
      mocks.auditRows.some((row) => row.action === "role.permissions_set"),
    ).toBe(true);
  });

  it("records audit when creating a custom role with sensitive permissions", async () => {
    await createCustomRole({
      name: "Override Operators",
      permissionCodes: ["allocation.override"],
      actorId: "actor-2",
      organizationId: "org-audit-test",
    });

    expect(
      mocks.auditRows.some(
        (row) =>
          row.action === "role.permission_grant" &&
          row.permissionCode === "allocation.override" &&
          row.reason === "custom_role_create",
      ),
    ).toBe(true);
    expect(mocks.auditRows.some((row) => row.action === "role.create")).toBe(
      true,
    );
  });

  it("does not audit non-sensitive permission grants on update", async () => {
    await setRolePermissions({
      roleId: "role-custom",
      permissionCodes: ["event.view", "order.create"],
      actorId: "actor-3",
    });

    const sensitiveGrants = mocks.auditRows.filter(
      (row) => row.action === "role.permission_grant",
    );
    expect(sensitiveGrants).toHaveLength(0);
    for (const code of ["event.view", "order.create"]) {
      expect(isSensitivePermission(code)).toBe(false);
    }
  });
});
