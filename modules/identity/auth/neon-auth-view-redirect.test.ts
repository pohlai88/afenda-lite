import { describe, expect, it } from "vitest";
import { ORG_SIGN_IN_FROM_PARAM } from "@/modules/identity/auth/auth-entry-params";
import { resolveNeonAuthViewRedirectTo } from "@/modules/identity/auth/neon-auth-view-redirect";
import { ORGANIZATION_ADMIN_DASHBOARD_HREF } from "@/modules/identity/client-session";

describe("resolveNeonAuthViewRedirectTo", () => {
  it("prefers sanitized returnTo", () => {
    expect(
      resolveNeonAuthViewRedirectTo({
        from: ORG_SIGN_IN_FROM_PARAM,
        returnTo: "/survey/demo",
      }),
    ).toBe("/survey/demo");
  });

  it("sends org sign-in to operator dashboard when returnTo is absent", () => {
    expect(
      resolveNeonAuthViewRedirectTo({ from: ORG_SIGN_IN_FROM_PARAM }),
    ).toBe(ORGANIZATION_ADMIN_DASHBOARD_HREF);
  });

  it("leaves client / generic auth on provider default", () => {
    expect(resolveNeonAuthViewRedirectTo({})).toBeUndefined();
    expect(resolveNeonAuthViewRedirectTo({ from: "client" })).toBeUndefined();
  });
});
