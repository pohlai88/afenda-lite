import { describe, expect, it } from "vitest";
import { mapClientSessionGuardToHttp } from "@/lib/api/json-response";
import { portalCopy } from "@/lib/portal-copy";

describe("mapClientSessionGuardToHttp", () => {
  it("maps guard reasons to JSON API status codes", () => {
    expect(mapClientSessionGuardToHttp("unauthenticated")).toEqual({
      status: 401,
      error: "Unauthorized",
    });
    expect(mapClientSessionGuardToHttp("operator")).toEqual({
      status: 403,
      error: "Forbidden",
    });
    expect(mapClientSessionGuardToHttp("onboarding_incomplete")).toEqual({
      status: 403,
      error: portalCopy.clientOnboarding.title,
    });
    expect(mapClientSessionGuardToHttp("preview_unavailable")).toEqual({
      status: 403,
      error: portalCopy.previewClient.notConfiguredTitle,
    });
  });
});
