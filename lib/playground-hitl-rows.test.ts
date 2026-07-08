import { describe, expect, it } from "vitest";

import { buildPlaygroundHitlRows } from "@/lib/playground-hitl-rows";
import {
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
} from "@/lib/playground-registry";

describe("buildPlaygroundHitlRows", () => {
  it("maps playground screens to HITL table rows", () => {
    const screens = playgroundScreenDefs.slice(0, 2).map((screen) => ({
      ...screen,
      path: resolvePlaygroundPathTemplate(screen.path),
    }));

    const rows = buildPlaygroundHitlRows(screens);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: screens[0]?.id,
      category: screens[0]?.category,
      label: screens[0]?.label,
      playgroundHref: `/playground/${screens[0]?.id}`,
    });
    expect(rows[0]?.embedHref).toContain("embed=1");
  });
});
