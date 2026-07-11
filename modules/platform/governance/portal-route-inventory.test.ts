import { describe, expect, it } from "vitest";

import {
  filePathToRoutePattern,
  scanAppPageRoutes,
  tagRoutePhase,
} from "@/modules/platform/governance/portal-route-inventory";

describe("portal-route-inventory", () => {
  it("converts page files to route patterns and strips route groups", () => {
    expect(filePathToRoutePattern("app/page.tsx")).toBe("/");
    expect(filePathToRoutePattern("app/dashboard/page.tsx")).toBe("/dashboard");
    expect(filePathToRoutePattern("app/dashboard/[declarationId]/page.tsx")).toBe(
      "/dashboard/[declarationId]",
    );
    expect(
      filePathToRoutePattern(
        "app/client/(workspace)/declare/[assignmentId]/page.tsx",
      ),
    ).toBe("/client/declare/[assignmentId]");
    expect(filePathToRoutePattern("app/fft/admin/events/page.tsx")).toBe(
      "/fft/admin/events",
    );
  });

  it("tags journey phases from route patterns", () => {
    expect(tagRoutePhase("/")).toBe("pre-login");
    expect(tagRoutePhase("/auth/sign-in")).toBe("pre-login");
    expect(tagRoutePhase("/join")).toBe("join");
    expect(tagRoutePhase("/client/onboarding")).toBe("onboarding");
    expect(tagRoutePhase("/client")).toBe("client-post-login");
    expect(tagRoutePhase("/client/declare/[assignmentId]")).toBe(
      "client-post-login",
    );
    expect(tagRoutePhase("/dashboard")).toBe("operator-post-login");
    expect(tagRoutePhase("/fft/events")).toBe("fft");
  });

  it("scans product pages and excludes playground + FFT locale shim", () => {
    const inventory = scanAppPageRoutes();

    expect(inventory.length).toBeGreaterThan(20);
    expect(
      inventory.every((entry) => !entry.file.startsWith("app/playground/")),
    ).toBe(true);
    expect(
      inventory.every((entry) => !entry.file.startsWith("app/fft/[locale]/")),
    ).toBe(true);
    expect(inventory.some((entry) => entry.file === "app/page.tsx")).toBe(true);
    expect(
      inventory.some((entry) => entry.file === "app/fft/admin/events/page.tsx"),
    ).toBe(true);
    expect(
      inventory.some(
        (entry) => entry.file === "app/dashboard/[declarationId]/page.tsx",
      ),
    ).toBe(true);
  });
});
