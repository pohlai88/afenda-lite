import { describe, expect, it } from "vitest";

import { organizationScopeSql } from "@/modules/fft/domain/organization-scope";

describe("fft organizationScopeSql", () => {
  it("matches Declarations soft-filter fragment shape", () => {
    expect(organizationScopeSql("organization_id", 1)).toBe(
      "(organization_id IS NULL OR organization_id = $1)",
    );
  });
});
