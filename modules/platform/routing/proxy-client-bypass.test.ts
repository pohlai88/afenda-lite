import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AUTH_SIGN_IN_HREF,
  buildClientSignInEmbedRedirectPath,
} from "@/modules/platform/routing/portal-routes";

const REPO_ROOT = join(import.meta.dirname, "../../..");

describe("proxy client sign-in bypass", () => {
  it("keeps /client/login public under the /client/:path* matcher", () => {
    const source = readFileSync(join(REPO_ROOT, "proxy.ts"), "utf8");
    expect(source).toContain("CLIENT_SIGN_IN_ENTRY_HREF");
    expect(source).toContain("isClientSignInEntry");
    expect(source).toContain("pathname === CLIENT_SIGN_IN_ENTRY_HREF");
  });

  it("hard-redirects playground embed of named client login to Neon sign-in", () => {
    const source = readFileSync(join(REPO_ROOT, "proxy.ts"), "utf8");
    expect(source).toContain("buildClientSignInEmbedRedirectPath");
    expect(source).toContain("isClientSignInEntry && isEmbed");

    expect(buildClientSignInEmbedRedirectPath()).toBe(
      `${AUTH_SIGN_IN_HREF}?embed=1`,
    );
  });

  it("preserves reason on the client-login embed redirect", () => {
    expect(
      buildClientSignInEmbedRedirectPath({ reason: "login-required" }),
    ).toBe(`${AUTH_SIGN_IN_HREF}?reason=login-required&embed=1`);
  });

  it("keeps the open-link survey route delegated to its entry runner", () => {
    const source = readFileSync(
      join(REPO_ROOT, "app/survey/[slug]/page.tsx"),
      "utf8",
    );
    expect(source).toContain('from "@/features/auth/entry/open-link-entry"');
    expect(source).toContain("openLinkPageMetadata");
    expect(source).toContain("export default runOpenLinkPage");
  });
});
