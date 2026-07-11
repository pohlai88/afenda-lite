import { describe, expect, it } from "vitest";

import type { PlaygroundHitlRow } from "@/features/playground/playground-hitl-rows";
import {
  filterHitlRows,
  hitlRowsEligibleForLiveEmbed,
  isAuthHitlRow,
  parseHitlViewFilters,
  serializeHitlViewFilters,
} from "@/features/playground/playground-hitl-views";
import { getPlaygroundRouteReview } from "@/features/playground/playground-route-review";

function row(
  partial: Partial<PlaygroundHitlRow> &
    Pick<PlaygroundHitlRow, "id" | "path" | "category" | "shape">,
): PlaygroundHitlRow {
  return {
    label: partial.id,
    routeFile: null,
    pathConfigured: partial.pathConfigured ?? true,
    review: partial.review ?? getPlaygroundRouteReview(partial.id),
    playgroundHref: `/playground/${partial.id}`,
    embedHref: `${partial.path.split("?")[0]}?embed=1`,
    ...partial,
  };
}

const sampleRows: PlaygroundHitlRow[] = [
  row({
    id: "admin-dashboard",
    category: "admin",
    path: "/dashboard",
    shape: "live",
  }),
  row({
    id: "auth-sign-in",
    category: "client",
    path: "/auth/sign-in",
    shape: "live",
  }),
  row({
    id: "client-org-login",
    category: "client",
    path: "/org/login",
    shape: "redirect",
  }),
  row({
    id: "client-dashboard",
    category: "client",
    path: "/client",
    shape: "stub",
  }),
  row({
    id: "fft-events",
    category: "fft",
    path: "/fft/events",
    shape: "closed",
  }),
  row({
    id: "gap",
    category: "dynamic",
    path: "/f/{token}",
    shape: "fixture-gap",
    pathConfigured: false,
  }),
];

describe("parseHitlViewFilters", () => {
  it("defaults to static list all/all", () => {
    expect(parseHitlViewFilters({})).toEqual({
      view: "static",
      cat: "all",
      shape: "all",
      attention: "all",
      present: "list",
      screen: null,
      liveShapeFocus: false,
    });
  });

  it("applies live shape focus when view=live and shape omitted", () => {
    expect(parseHitlViewFilters({ view: "live" })).toMatchObject({
      view: "live",
      shape: "all",
      present: "list",
      screen: null,
      liveShapeFocus: true,
    });
  });

  it("disables live focus when shape is explicit", () => {
    expect(
      parseHitlViewFilters({ view: "live", shape: "all" }),
    ).toMatchObject({
      liveShapeFocus: false,
      shape: "all",
    });
    expect(
      parseHitlViewFilters({ view: "live", shape: "redirect" }),
    ).toMatchObject({
      liveShapeFocus: false,
      shape: "redirect",
    });
  });

  it("parses static inspect + screen (legacy composition alias)", () => {
    expect(
      parseHitlViewFilters({
        view: "static",
        present: "composition",
        screen: "admin-dashboard",
      }),
    ).toMatchObject({
      view: "static",
      present: "inspect",
      screen: "admin-dashboard",
    });
  });

  it("parses present=inspect", () => {
    expect(
      parseHitlViewFilters({
        view: "static",
        present: "inspect",
        screen: "client-dashboard",
      }),
    ).toMatchObject({
      present: "inspect",
      screen: "client-dashboard",
    });
  });
});

describe("serializeHitlViewFilters", () => {
  it("omits shape under live focus", () => {
    const params = serializeHitlViewFilters(
      {
        view: "live",
        cat: "auth",
        shape: "all",
        attention: "all",
        present: "list",
        screen: null,
      },
      { liveShapeFocus: true },
    );
    expect(params.get("view")).toBe("live");
    expect(params.get("cat")).toBe("auth");
    expect(params.get("shape")).toBeNull();
    expect(params.get("present")).toBeNull();
  });

  it("serializes inspect present + screen", () => {
    const params = serializeHitlViewFilters({
      view: "static",
      cat: "all",
      shape: "all",
      attention: "all",
      present: "inspect",
      screen: "admin-clients",
    });
    expect(params.get("present")).toBe("inspect");
    expect(params.get("screen")).toBe("admin-clients");
  });
});

describe("isAuthHitlRow", () => {
  it("matches auth and login entry paths", () => {
    expect(isAuthHitlRow({ path: "/auth/sign-in" })).toBe(true);
    expect(isAuthHitlRow({ path: "/org/login?reason=access-denied" })).toBe(
      true,
    );
    expect(isAuthHitlRow({ path: "/client/login" })).toBe(true);
    expect(isAuthHitlRow({ path: "/dashboard" })).toBe(false);
  });
});

describe("filterHitlRows", () => {
  it("filters by auth path bucket", () => {
    const filtered = filterHitlRows(sampleRows, {
      view: "static",
      cat: "auth",
      shape: "all",
      attention: "all",
      present: "list",
      screen: null,
    });
    expect(filtered.map((r) => r.id).sort()).toEqual([
      "auth-sign-in",
      "client-org-login",
    ]);
  });

  it("filters trade category", () => {
    const filtered = filterHitlRows(sampleRows, {
      view: "static",
      cat: "fft",
      shape: "all",
      attention: "all",
      present: "list",
      screen: null,
    });
    expect(filtered.map((r) => r.id)).toEqual(["fft-events"]);
  });

  it("applies live default shapes when liveShapeFocus", () => {
    const filtered = filterHitlRows(
      sampleRows,
      {
        view: "live",
        cat: "all",
        shape: "all",
        attention: "all",
        present: "list",
        screen: null,
      },
      { liveShapeFocus: true },
    );
    expect(filtered.map((r) => r.id).sort()).toEqual([
      "admin-dashboard",
      "auth-sign-in",
      "client-org-login",
    ]);
  });

  it("filters by human workflow attention", () => {
    const filtered = filterHitlRows(sampleRows, {
      view: "static",
      cat: "all",
      shape: "all",
      attention: "blocked",
      present: "list",
      screen: null,
    });

    expect(filtered.map((row) => row.id)).toEqual([
      "client-dashboard",
      "fft-events",
      "gap",
    ]);
  });
});

describe("hitlRowsEligibleForLiveEmbed", () => {
  it("excludes fixture-gap and unconfigured", () => {
    const eligible = hitlRowsEligibleForLiveEmbed(sampleRows);
    expect(eligible.some((r) => r.shape === "fixture-gap")).toBe(false);
    expect(eligible.map((r) => r.id)).toContain("admin-dashboard");
  });
});
