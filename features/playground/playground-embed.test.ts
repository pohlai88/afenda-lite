import { describe, expect, it } from "vitest";

import {
  appendPlaygroundEmbedQuery,
  isPlaygroundEmbed,
} from "@/features/playground/playground";

describe("playground embed helpers", () => {
  it("detects embed query param", () => {
    expect(isPlaygroundEmbed({ embed: "1" })).toBe(true);
    expect(isPlaygroundEmbed({ embed: ["1"] })).toBe(true);
    expect(isPlaygroundEmbed({})).toBe(false);
  });

  it("appends embed query to plain and existing query hrefs", () => {
    expect(appendPlaygroundEmbedQuery("/auth/sign-in")).toBe(
      "/auth/sign-in?embed=1",
    );
    expect(appendPlaygroundEmbedQuery("/auth/sign-in?from=org")).toBe(
      "/auth/sign-in?from=org&embed=1",
    );
  });
});
