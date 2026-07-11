import { describe, expect, it } from "vitest";

import {
  buildPlaygroundHitlFingerprint,
  buildPlaygroundHitlRows,
  countPlaygroundHitlAttention,
  countPlaygroundHitlMarks,
  countPlaygroundHitlShapes,
  parsePlaygroundHitlReviews,
  resolvePlaygroundHitlMark,
  setPlaygroundHitlReview,
} from "@/features/playground/playground-hitl-rows";
import {
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
} from "@/features/playground/playground-registry";
import {
  declaredPlaygroundPageShape,
  isPlaygroundPageOutOfShape,
  playgroundScreenShapeById,
  resolvePlaygroundPageShape,
} from "@/features/playground/playground-page-shape";
import {
  getPlaygroundRouteReview,
  playgroundRouteReviewById,
} from "@/features/playground/playground-route-review";

describe("buildPlaygroundHitlRows", () => {
  it("maps playground screens to HITL table rows with shape", () => {
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
      shape: "live",
    });
    expect(rows[0]?.review?.purpose).toBeTruthy();
    expect(rows[0]?.embedHref).toContain("embed=1");
  });

  it("covers every curated screen id with one review definition", () => {
    for (const screen of playgroundScreenDefs) {
      expect(getPlaygroundRouteReview(screen.id)).not.toBeNull();
      expect(playgroundScreenShapeById[screen.id]).toBeDefined();
    }
    expect(Object.keys(playgroundRouteReviewById)).toHaveLength(
      playgroundScreenDefs.length,
    );
  });

  it("states the invitation and onboarding fixtures without guessing", () => {
    expect(getPlaygroundRouteReview("client-onboarding")).toMatchObject({
      shape: "stub",
      primary: {
        outcome: "render",
        summary: expect.stringContaining("not a redirect"),
      },
      action: { kind: "blocked" },
    });
    expect(getPlaygroundRouteReview("dynamic-client-join")).toMatchObject({
      shape: "stub",
      primary: {
        outcome: "render",
        summary: expect.stringContaining("placeholder"),
      },
      action: { kind: "repair" },
    });
    expect(
      getPlaygroundRouteReview("dynamic-auth-accept-invitation"),
    ).toMatchObject({
      shape: "redirect",
      primary: {
        outcome: "redirect",
        destinations: ["/auth/sign-in?redirectTo=/auth/accept-invitation"],
      },
      alternates: [
        expect.objectContaining({
          outcome: "redirect",
          when: expect.stringContaining("invitationId"),
          destinations: ["/join?invitationId=…"],
        }),
      ],
    });
  });

  it("does not mislabel missing public-link data as a redirect destination", () => {
    expect(getPlaygroundRouteReview("dynamic-public-survey-slug")).toMatchObject({
      primary: {
        outcome: "redirect-or-not-found",
        destinations: ["/auth/sign-in?returnTo=…", "/client/declare/…"],
      },
    });
    expect(getPlaygroundRouteReview("dynamic-public-secure-token")).toMatchObject({
      primary: { outcome: "redirect-or-not-found" },
    });
  });
});

describe("playground page shape", () => {
  it("overrides to fixture-gap when path is not configured", () => {
    expect(resolvePlaygroundPageShape("live", false)).toBe("fixture-gap");
    expect(resolvePlaygroundPageShape("stub", true)).toBe("stub");
    expect(isPlaygroundPageOutOfShape("live")).toBe(false);
    expect(isPlaygroundPageOutOfShape("stub")).toBe(true);
  });

  it("counts shapes on HITL rows", () => {
    const screens = playgroundScreenDefs.map((screen) => ({
      ...screen,
      path: resolvePlaygroundPathTemplate(screen.path),
    }));
    const rows = buildPlaygroundHitlRows(screens);
    const counts = countPlaygroundHitlShapes(rows);

    expect(counts.live + counts.redirect + counts.stub + counts.closed + counts["fixture-gap"]).toBe(
      rows.length,
    );
    expect(declaredPlaygroundPageShape("admin-dashboard")).toBe("live");
    expect(declaredPlaygroundPageShape("client-dashboard")).toBe("stub");
    expect(declaredPlaygroundPageShape("fft-events")).toBe("closed");
  });
});

describe("playground HITL marks", () => {
  it("invalidates fingerprints when the source-backed review contract changes", () => {
    const review = getPlaygroundRouteReview("dynamic-client-join");
    expect(review).not.toBeNull();

    const original = buildPlaygroundHitlFingerprint(
      "/join",
      true,
      "stub",
      review,
    );
    const changed = buildPlaygroundHitlFingerprint("/join", true, "stub", {
      ...review!,
      purpose: `${review!.purpose} Updated.`,
    });

    expect(changed).not.toBe(original);
  });

  it("resolves pending, explicit verdicts, and obsolete", () => {
    const fingerprint = buildPlaygroundHitlFingerprint("/dashboard", true, "live");

    expect(resolvePlaygroundHitlMark(undefined, fingerprint)).toBe("pending");
    expect(
      resolvePlaygroundHitlMark(
        {
          fingerprint,
          reviewedAt: "2026-07-11T00:00:00.000Z",
          verdict: "matches",
        },
        fingerprint,
      ),
    ).toBe("matches");
    expect(
      resolvePlaygroundHitlMark(
        {
          fingerprint: "/old|1|live",
          reviewedAt: "2026-07-11T00:00:00.000Z",
          verdict: "matches",
        },
        fingerprint,
      ),
    ).toBe("obsolete");
  });

  it("stores verdicts and notes without losing other rows", () => {
    const fingerprint = buildPlaygroundHitlFingerprint("/a", true, "live");
    const reviews = setPlaygroundHitlReview(
      {
        untouched: {
          fingerprint: "other",
          reviewedAt: "2026-07-11T00:00:00.000Z",
          verdict: "matches",
        },
      },
      "a",
      fingerprint,
      { verdict: "needs-repair", note: "Missing product UI" },
    );

    expect(reviews.a).toMatchObject({
      fingerprint,
      verdict: "needs-repair",
      note: "Missing product UI",
    });
    expect(reviews.untouched?.verdict).toBe("matches");
  });

  it("stamps note-only edits with the current fingerprint without carrying a stale verdict", () => {
    const reviews = setPlaygroundHitlReview(
      {
        route: {
          fingerprint: "obsolete",
          reviewedAt: "2026-07-11T00:00:00.000Z",
          verdict: "matches",
        },
      },
      "route",
      "current",
      { note: "Rechecked against the current source contract." },
    );

    expect(reviews.route).toEqual(
      expect.objectContaining({
      fingerprint: "current",
      note: "Rechecked against the current source contract.",
      }),
    );
    expect(reviews.route?.verdict).toBeUndefined();
    expect(resolvePlaygroundHitlMark(reviews.route, "current")).toBe("pending");
  });

  it("imports v2 and legacy confirmations as obsolete evidence", () => {
    const v2 = parsePlaygroundHitlReviews(
      JSON.stringify({
        version: 2,
        reviews: {
          route: {
            fingerprint: "/old|1|live",
            reviewedAt: "2026-07-11T00:00:00.000Z",
          },
        },
      }),
    );
    const legacy = parsePlaygroundHitlReviews(JSON.stringify({ route: true }));
    const current = buildPlaygroundHitlFingerprint("/route", true, "live");

    expect(resolvePlaygroundHitlMark(v2.route, current)).toBe("obsolete");
    expect(resolvePlaygroundHitlMark(legacy.route, current)).toBe("obsolete");
  });

  it("parses current version-three reviews", () => {
    const reviews = parsePlaygroundHitlReviews(
      JSON.stringify({
        version: 3,
        reviews: {
          route: {
            fingerprint: "current",
            reviewedAt: "2026-07-11T00:00:00.000Z",
            verdict: "needs-repair",
            note: "Missing UI",
          },
        },
      }),
    );

    expect(reviews.route).toMatchObject({
      fingerprint: "current",
      verdict: "needs-repair",
      note: "Missing UI",
    });
  });

  it("counts marks across rows", () => {
    const rows = [
      { id: "a", path: "/a", pathConfigured: true, shape: "live" as const },
      { id: "b", path: "/b", pathConfigured: false, shape: "fixture-gap" as const },
      { id: "c", path: "/c", pathConfigured: true, shape: "stub" as const },
    ];
    let reviews = {};
    reviews = setPlaygroundHitlReview(
      reviews,
      "a",
      buildPlaygroundHitlFingerprint("/a", true, "live"),
      { verdict: "matches" },
    );
    reviews = setPlaygroundHitlReview(
      reviews,
      "b",
      buildPlaygroundHitlFingerprint("/old", true, "live"),
      { verdict: "matches" },
    );

    expect(countPlaygroundHitlMarks(rows, reviews)).toEqual({
      matches: 1,
      "needs-repair": 0,
      obsolete: 1,
      pending: 1,
    });
  });

  it("derives mutually exclusive workflow attention", () => {
    const screens = playgroundScreenDefs.filter(({ id }) =>
      [
        "admin-dashboard",
        "dynamic-client-join",
        "client-onboarding",
      ].includes(id),
    );
    const rows = buildPlaygroundHitlRows(screens);
    const dashboard = rows.find(({ id }) => id === "admin-dashboard")!;
    const dashboardFingerprint = buildPlaygroundHitlFingerprint(
      dashboard.path,
      dashboard.pathConfigured,
      dashboard.shape,
      dashboard.review,
    );
    const reviews = setPlaygroundHitlReview(
      {},
      dashboard.id,
      dashboardFingerprint,
      { verdict: "matches" },
    );

    expect(countPlaygroundHitlAttention(rows, reviews)).toEqual({
      "needs-review": 0,
      verified: 1,
      repair: 1,
      blocked: 1,
    });
  });
});
