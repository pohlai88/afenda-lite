import { describe, expect, it } from "vitest";

import { organizationScopeSql } from "@/modules/fft/domain/organization-scope";

describe("fft organizationScopeSql", () => {
  it("hard-scopes to the active organization", () => {
    expect(organizationScopeSql("organization_id", 1)).toBe(
      "organization_id = $1",
    );
  });
});
