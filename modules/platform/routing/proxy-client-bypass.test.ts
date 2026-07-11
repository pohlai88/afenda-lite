import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(import.meta.dirname, "../../..");

describe("proxy client sign-in bypass", () => {
  it("keeps /client/login public under the /client/:path* matcher", () => {
    const source = readFileSync(join(REPO_ROOT, "proxy.ts"), "utf8");
    expect(source).toContain("CLIENT_SIGN_IN_ENTRY_HREF");
    expect(source).toContain("isClientSignInEntry");
    expect(source).toContain('pathname === CLIENT_SIGN_IN_ENTRY_HREF');
  });

  it("keeps the open-link survey route delegated to its entry runner", () => {
    const source = readFileSync(
      join(REPO_ROOT, "app/survey/[slug]/page.tsx"),
      "utf8",
    );
    expect(source).toContain(
      'from "@/lib/entry/open-link-entry"',
    );
    expect(source).toContain("openLinkPageMetadata");
    expect(source).toContain("export default runOpenLinkPage");
  });
});
