import { describe, expect, it } from "vitest";
import {
  buildPlaygroundScreenViewModel,
  playgroundScreenCategoryLabel,
  resolvePlaygroundScreenMetadataTitle,
} from "@/lib/playground/playground-screen.logic";

describe("playgroundScreenCategoryLabel", () => {
  it("maps playground categories to display labels", () => {
    expect(playgroundScreenCategoryLabel("admin")).toBe("Admin");
    expect(playgroundScreenCategoryLabel("client")).toBe("Client");
    expect(playgroundScreenCategoryLabel("dynamic")).toBe("Dynamic route");
    expect(playgroundScreenCategoryLabel("hot-sales")).toBe("Hot Sales");
    expect(playgroundScreenCategoryLabel("auto")).toBe("Auto-discovered");
  });
});

describe("buildPlaygroundScreenViewModel", () => {
  it("builds embed metadata for configured paths", () => {
    const view = buildPlaygroundScreenViewModel({
      id: "admin-dashboard",
      category: "admin",
      label: "Dashboard",
      path: "/dashboard",
    });

    expect(view).toMatchObject({
      categoryLabel: "Admin",
      pathConfigured: true,
      embedUrl: "/dashboard?embed=1",
    });
  });

  it("marks unresolved template paths as unconfigured", () => {
    const view = buildPlaygroundScreenViewModel({
      id: "client-declare",
      category: "client",
      label: "Declaration form",
      path: "/client/declare/{PLAYGROUND_ASSIGNMENT_ID}",
    });

    expect(view.pathConfigured).toBe(false);
  });
});

describe("resolvePlaygroundScreenMetadataTitle", () => {
  it("uses the screen label when present", () => {
    expect(
      resolvePlaygroundScreenMetadataTitle(
        {
          id: "admin-dashboard",
          category: "admin",
          label: "Dashboard",
          path: "/dashboard",
        },
        "IAM Check",
      ),
    ).toBe("IAM Check — Playground · Dashboard");
  });
});
