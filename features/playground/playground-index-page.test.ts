import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn((href: string) => {
  throw new Error(`REDIRECT:${href}`);
});

vi.mock("next/navigation", () => ({
  redirect: (href: string) => mockRedirect(href),
}));

vi.mock("@/features/playground/playground", () => ({
  playgroundScreens: [{ id: "admin-dashboard", category: "admin", label: "Dashboard", path: "/dashboard" }],
}));

import { runPlaygroundIndexPage } from "@/features/playground/playground-index-page";

describe("runPlaygroundIndexPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the first playground screen", () => {
    expect(() => runPlaygroundIndexPage()).toThrow("REDIRECT:/playground/admin-dashboard");
  });
});
