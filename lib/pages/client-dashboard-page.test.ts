import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { portalCopy } from "@/lib/copy/portal-copy";
import {
  clientDashboardPageMetadata,
  runClientDashboardPage,
} from "@/lib/pages/client-dashboard-page";

describe("clientDashboardPageMetadata", () => {
  it("exports unavailable stub metadata from portal copy", () => {
    expect(clientDashboardPageMetadata.title).toContain(
      portalCopy.clientWorkspace.unavailableTitle,
    );
    expect(clientDashboardPageMetadata.description).toBe(
      portalCopy.clientWorkspace.unavailableDescription,
    );
    expect(clientDashboardPageMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });
});

describe("runClientDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders unavailable stub instead of redirecting", async () => {
    const ui = await runClientDashboardPage();
    expect(ui).toBeTruthy();
    expect(ui.props.copy).toEqual({
      eyebrow: portalCopy.clientWorkspace.eyebrow,
      title: portalCopy.clientWorkspace.unavailableTitle,
      description: portalCopy.clientWorkspace.unavailableDescription,
      signOutLabel: portalCopy.clientWorkspace.unavailableSignOutLabel,
    });
  });
});
