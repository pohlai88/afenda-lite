import { describe, expect, it } from "vitest";

import {
  getPlaygroundE2eFixture,
  playgroundE2eFixtures,
} from "@/features/playground/playground-e2e-fixtures";
import { playgroundScreenDefs } from "@/features/playground/playground-registry";

describe("playgroundE2eFixtures", () => {
  it("covers every curated playground screen exactly once", () => {
    expect(playgroundE2eFixtures).toHaveLength(playgroundScreenDefs.length);
    expect(new Set(playgroundE2eFixtures.map(({ id }) => id)).size).toBe(
      playgroundScreenDefs.length,
    );
  });

  it.each([
    ["client-home-login", "Sign in"],
    ["client-dashboard", "Client Workspace"],
    ["client-onboarding", "Onboarding"],
    ["client-profile", "Profile"],
    ["client-declare", "Declaration"],
    ["dynamic-declare-id", "Declaration"],
    ["dynamic-auth-reset-password", "Sign in"],
  ])("matches the current registered outcome for %s", (screenId, marker) => {
    expect(getPlaygroundE2eFixture(screenId)?.iframeMarker.test(marker)).toBe(
      true,
    );
  });
});
