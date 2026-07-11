/**
 * Playground page-shape enum — honest status for live-route review.
 * Storybook shows designed UI; playground must label when the mounted page
 * is not product-shaped (stub / redirect / closed phase / missing fixture).
 */

import {
  PLAYGROUND_PAGE_SHAPES,
  getPlaygroundRouteReview,
  playgroundRouteReviewById,
  type PlaygroundPageShape,
} from "@/features/playground/playground-route-review";

export { PLAYGROUND_PAGE_SHAPES, type PlaygroundPageShape };

/** Declared shapes for curated screens (fixture-gap is computed only). */
export type PlaygroundDeclaredPageShape = Exclude<
  PlaygroundPageShape,
  "fixture-gap"
>;

export const PLAYGROUND_PAGE_SHAPE_LABEL: Record<PlaygroundPageShape, string> = {
  live: "Live",
  redirect: "Redirect gate",
  stub: "Stub",
  closed: "Closed phase",
  "fixture-gap": "Fixture gap",
};

export const PLAYGROUND_PAGE_SHAPE_DESCRIPTION: Record<
  PlaygroundPageShape,
  string
> = {
  live: "The registered fixture is expected to render reviewable UI.",
  redirect:
    "The registered fixture is expected to leave this URL — verify the final outcome.",
  stub: "Placeholder page — not product shape.",
  closed: "Phase closed — will not match product until reopened.",
  "fixture-gap": "Path fixture missing or unresolved — cannot embed.",
};

/** True when the mounted page is not product-shaped for live review. */
export function isPlaygroundPageOutOfShape(shape: PlaygroundPageShape) {
  return shape !== "live";
}

export function resolvePlaygroundPageShape(
  declared: PlaygroundDeclaredPageShape,
  pathConfigured: boolean,
): PlaygroundPageShape {
  if (!pathConfigured) {
    return "fixture-gap";
  }

  return declared;
}

export function countPlaygroundPageShapes(
  shapes: PlaygroundPageShape[],
): Record<PlaygroundPageShape, number> {
  const counts: Record<PlaygroundPageShape, number> = {
    live: 0,
    redirect: 0,
    stub: 0,
    closed: 0,
    "fixture-gap": 0,
  };

  for (const shape of shapes) {
    counts[shape] += 1;
  }

  return counts;
}

/** Compatibility projection for existing shape filters and static inspect. */
export const playgroundScreenShapeById: Record<
  string,
  PlaygroundDeclaredPageShape
> = Object.fromEntries(
  Object.entries(playgroundRouteReviewById).map(([screenId, review]) => [
    screenId,
    review.shape,
  ]),
);

export function declaredPlaygroundPageShape(
  screenId: string,
): PlaygroundDeclaredPageShape {
  return getPlaygroundRouteReview(screenId)?.shape ?? "stub";
}
