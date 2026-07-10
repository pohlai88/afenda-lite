import { describe, expect, it } from "vitest";

import {
  filePathToRoutePattern,
  scanAppPageRoutes,
  tagRoutePhase,
} from "@/lib/governance/portal-route-inventory";

describe("portal-route-inventory", () => {
  it("converts page files to route patterns and strips route groups", () => {
    expect(filePathToRoutePattern("app/page.tsx")).toBe("/");
    expect(filePathToRoutePattern("app/dashboard/page.tsx")).toBe("/dashboard");
    expect(filePathToRoutePattern("app/dashboard/[id]/page.tsx")).toBe(
      "/dashboard/[id]",
    );
    expect(
      filePathToRoutePattern("app/client/(workspace)/declare/[id]/page.tsx"),
    ).toBe("/client/declare/[id]");
    expect(
      filePathToRoutePattern("app/trade/[locale]/admin/events/page.tsx"),
    ).toBe("/trade/[locale]/admin/events");
  });

  it("tags journey phases from route patterns", () => {
    expect(tagRoutePhase("/")).toBe("pre-login");
    expect(tagRoutePhase("/auth/sign-in")).toBe("pre-login");
    expect(tagRoutePhase("/join")).toBe("join");
    expect(tagRoutePhase("/client/onboarding")).toBe("onboarding");
    expect(tagRoutePhase("/client")).toBe("client-post-login");
    expect(tagRoutePhase("/client/declare/[id]")).toBe("client-post-login");
    expect(tagRoutePhase("/dashboard")).toBe("operator-post-login");
    expect(tagRoutePhase("/trade/[locale]/events")).toBe("hot-sales");
  });

  it("scans product pages and excludes playground meta routes", () => {
    const inventory = scanAppPageRoutes();

    expect(inventory.length).toBeGreaterThan(20);
    expect(inventory.every((entry) => !entry.file.startsWith("app/playground/"))).toBe(
      true,
    );
    expect(inventory.some((entry) => entry.file === "app/page.tsx")).toBe(true);
    expect(
      inventory.some((entry) => entry.file === "app/trade/[locale]/events/page.tsx"),
    ).toBe(true);
  });
});
