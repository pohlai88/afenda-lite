import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/modules/platform/db", () => ({
  pool: { query: mocks.query },
}));

import {
  deletePlatformRole,
  updatePlatformRole,
} from "@/modules/identity/domain/platform-rbac";
import {
  asOrganizationId,
  asPlatformRoleId,
  permissionCodeSchema,
} from "@/modules/identity/schemas/platform-rbac";

const declarationsRead = permissionCodeSchema.parse("declarations.read");

function roleRow(overrides: {
  organization_id: string | null;
  is_system_template?: boolean;
}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: overrides.organization_id,
    name: "Custom",
    description: null,
    active: true,
    is_system_template: overrides.is_system_template ?? false,
    template_key: null,
    permission_codes: ["declarations.read"],
  };
}

describe("platform role org mutation guards", () => {
  const orgA = asOrganizationId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  const roleId = asPlatformRoleId("11111111-1111-4111-8111-111111111111");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forbids update of NULL-org custom role from org edge", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [roleRow({ organization_id: null })] });

    const result = await updatePlatformRole({
      organizationId: orgA,
      actorUserId: "user-1",
      data: {
        roleId,
        name: "Hijack",
        permissionCodes: [declarationsRead],
      },
    });

    expect(result).toMatchObject({ error: "FORBIDDEN" });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("forbids delete of NULL-org custom role from org edge", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [roleRow({ organization_id: null })] });

    const result = await deletePlatformRole({
      organizationId: orgA,
      roleId,
      actorUserId: "user-1",
    });

    expect(result).toMatchObject({ error: "FORBIDDEN" });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("forbids update of another org's role", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [roleRow({ organization_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })],
    });

    const result = await updatePlatformRole({
      organizationId: orgA,
      actorUserId: "user-1",
      data: {
        roleId,
        name: "Hijack",
        permissionCodes: [declarationsRead],
      },
    });

    expect(result).toEqual({ error: "FORBIDDEN" });
  });
});
