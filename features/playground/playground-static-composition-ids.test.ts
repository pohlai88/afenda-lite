import { describe, expect, it } from "vitest";

import {
  PLAYGROUND_STATIC_COMPOSITION_IDS,
  isPlaygroundStaticCompositionId,
} from "@/features/playground/playground-static-composition-ids";
import { playgroundScreenDefs } from "@/features/playground/playground-registry";

describe("playground static composition allowlist", () => {
  it("only includes curated screen ids that exist in the registry", () => {
    const registryIds = new Set(playgroundScreenDefs.map((screen) => screen.id));
    for (const id of PLAYGROUND_STATIC_COMPOSITION_IDS) {
      expect(registryIds.has(id)).toBe(true);
      expect(isPlaygroundStaticCompositionId(id)).toBe(true);
    }
  });

  it("rejects unknown screen ids", () => {
    expect(isPlaygroundStaticCompositionId("fft-events")).toBe(false);
    expect(isPlaygroundStaticCompositionId("client-dashboard")).toBe(false);
  });

  it("includes declaration detail screens for PLAYGROUND_SURVEY_ID compositions", () => {
    expect(PLAYGROUND_STATIC_COMPOSITION_IDS).toContain("admin-survey-detail");
    expect(PLAYGROUND_STATIC_COMPOSITION_IDS).toContain("dynamic-dashboard-id");
  });

  it("does not fake auth chrome as a static mount", () => {
    expect(isPlaygroundStaticCompositionId("auth-sign-in")).toBe(false);
  });
});
