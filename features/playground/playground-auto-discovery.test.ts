import { describe, expect, it } from "vitest";

import {
  buildPlaygroundScreensWithAutoDiscovery,
  discoverUncuratedPlaygroundScreens,
} from "@/features/playground/playground-auto-discovery";
import { groupPlaygroundNav } from "@/features/playground/playground";
import { playgroundScreenDefs } from "@/features/playground/playground-registry";

describe("playground auto-discovery", () => {
  it("registers Users list and view as curated admin screens", () => {
    expect(
      playgroundScreenDefs.find((screen) => screen.id === "admin-users-list"),
    ).toMatchObject({
      category: "admin",
      path: "/dashboard/users",
      routeFile: "app/dashboard/users/page.tsx",
    });
    expect(
      playgroundScreenDefs.find((screen) => screen.id === "admin-users-view"),
    ).toMatchObject({
      category: "admin",
      path: "/dashboard/users/user-001",
      routeFile: "app/dashboard/users/[userId]/page.tsx",
    });
  });

  it("does not duplicate curated Users routes into auto screens", () => {
    const auto = discoverUncuratedPlaygroundScreens();
    expect(
      auto.some((screen) => screen.routeFile === "app/dashboard/users/page.tsx"),
    ).toBe(false);
    expect(
      auto.some(
        (screen) =>
          screen.routeFile === "app/dashboard/users/[userId]/page.tsx",
      ),
    ).toBe(false);
  });

  it("surfaces Users under Admin nav grouping", () => {
    const nav = groupPlaygroundNav(buildPlaygroundScreensWithAutoDiscovery());
    expect(nav.admin.some((screen) => screen.id === "admin-users-list")).toBe(
      true,
    );
    expect(nav.admin.some((screen) => screen.id === "admin-users-view")).toBe(
      true,
    );
  });
});
