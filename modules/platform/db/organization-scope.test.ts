import { describe, expect, it } from "vitest";

import { organizationScopeSql } from "@/modules/platform/db/organization-scope";

describe("hard tenancy isolation predicates", () => {
  it("scopes event/survey/user reads to exact org param", () => {
    expect(organizationScopeSql("organization_id", 2)).toBe(
      "organization_id = $2",
    );
    expect(organizationScopeSql("s.organization_id", 1)).toBe(
      "s.organization_id = $1",
    );
  });
});
