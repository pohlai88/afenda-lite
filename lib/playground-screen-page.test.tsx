import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/components/playground-screen-preview", () => ({
  PlaygroundScreenPreview: () => null,
}));

vi.mock("@/lib/playground", () => ({
  getPlaygroundScreen: (id: string) =>
    id === "admin-dashboard"
      ? {
          id: "admin-dashboard",
          category: "admin",
          label: "Dashboard",
          path: "/dashboard",
        }
      : undefined,
  getPlaygroundScreenIds: () => ["admin-dashboard"],
}));

import { playgroundScreenPageMetadata } from "@/lib/playground-screen-page";

describe("playgroundScreenPageMetadata", () => {
  it("returns a screen-specific title when the screen exists", async () => {
    const metadata = await playgroundScreenPageMetadata({
      params: Promise.resolve({ screenId: "admin-dashboard" }),
    });

    expect(metadata.title).toContain("Dashboard");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("returns generic playground metadata for unknown screens", async () => {
    const metadata = await playgroundScreenPageMetadata({
      params: Promise.resolve({ screenId: "missing-screen" }),
    });

    expect(metadata.title).toMatch(/Playground$/);
  });
});
