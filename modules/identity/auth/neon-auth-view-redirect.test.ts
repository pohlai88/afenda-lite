import { describe, expect, it } from "vitest";
import { ORG_SIGN_IN_FROM_PARAM } from "@/modules/identity/auth/auth-entry-params";
import { resolveNeonAuthViewRedirectTo } from "@/modules/identity/auth/neon-auth-view-redirect";
import { OPERATOR_DASHBOARD_HREF } from "@/modules/identity/client-session";

describe("resolveNeonAuthViewRedirectTo", () => {
  it("prefers sanitized returnTo", () => {
    expect(
      resolveNeonAuthViewRedirectTo({
        from: ORG_SIGN_IN_FROM_PARAM,
        returnTo: "/dashboard/clients",
      }),
    ).toBe("/dashboard/clients");
  });

  it("sends org sign-in to operator dashboard when returnTo is absent", () => {
    expect(
      resolveNeonAuthViewRedirectTo({ from: ORG_SIGN_IN_FROM_PARAM }),
    ).toBe(OPERATOR_DASHBOARD_HREF);
  });

  it("leaves client / generic auth on provider default", () => {
    expect(resolveNeonAuthViewRedirectTo({})).toBeUndefined();
    expect(resolveNeonAuthViewRedirectTo({ from: "client" })).toBeUndefined();
  });
});
