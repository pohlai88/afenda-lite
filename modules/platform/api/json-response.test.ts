import { describe, expect, it } from "vitest";
import { mapClientSessionGuardToHttp } from "@/modules/platform/api/json-response";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

describe("mapClientSessionGuardToHttp", () => {
  it("maps guard reasons to JSON API status codes", () => {
    expect(mapClientSessionGuardToHttp("unauthenticated")).toEqual({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
    expect(mapClientSessionGuardToHttp("organizationAdmin")).toEqual({
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mapClientSessionGuardToHttp("onboarding_incomplete")).toEqual({
      status: 403,
      code: "FORBIDDEN",
      message: portalCopy.clientOnboarding.title,
    });
    expect(mapClientSessionGuardToHttp("preview_unavailable")).toEqual({
      status: 403,
      code: "FORBIDDEN",
      message: portalCopy.previewClient.notConfiguredTitle,
    });
  });
});
