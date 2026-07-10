import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { portalCopy } from "@/lib/copy/portal-copy";
import {
  clientProfilePageMetadata,
  runClientProfilePage,
} from "@/lib/pages/client-profile-page";

describe("clientProfilePageMetadata", () => {
  it("exports unavailable stub metadata from portal copy", () => {
    expect(clientProfilePageMetadata.title).toContain(
      portalCopy.clientWorkspace.unavailableTitle,
    );
    expect(clientProfilePageMetadata.description).toBe(
      portalCopy.clientWorkspace.unavailableDescription,
    );
  });
});

describe("runClientProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the shared unavailable panel", async () => {
    const ui = await runClientProfilePage();
    expect(ui.props.copy).toEqual({
      eyebrow: portalCopy.clientProfile.eyebrow,
      title: portalCopy.clientWorkspace.unavailableTitle,
      description: portalCopy.clientWorkspace.unavailableDescription,
      signOutLabel: portalCopy.clientWorkspace.unavailableSignOutLabel,
    });
  });
});
