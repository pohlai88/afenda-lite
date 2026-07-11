import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("supabase retirement", () => {
  it("documents the retired stack under docs/legacy/supabase.md", () => {
    const legacyDoc = join(process.cwd(), "docs/legacy/supabase.md");
    expect(existsSync(legacyDoc)).toBe(true);
    expect(existsSync(join(process.cwd(), "supabase"))).toBe(false);
  });
});
