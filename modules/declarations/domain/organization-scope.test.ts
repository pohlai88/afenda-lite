import { describe, expect, it } from "vitest";

import { organizationScopeSql } from "@/modules/declarations/domain/organization-scope";

describe("organizationScopeSql", () => {
  it("hard-scopes to the active organization", () => {
    expect(organizationScopeSql("organization_id", 1)).toBe(
      "organization_id = $1",
    );
    expect(organizationScopeSql("a.organization_id", 2)).toBe(
      "a.organization_id = $2",
    );
  });
});
