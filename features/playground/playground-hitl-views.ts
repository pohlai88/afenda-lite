/**
 * Route-review filters (Live | Static + category/attention/compatibility shape).
 * URL: ?view=live|static&cat=...&attention=...&shape=...
 */

import {
  resolvePlaygroundHitlAttention,
  type PlaygroundHitlReviews,
  type PlaygroundHitlRow,
} from "@/features/playground/playground-hitl-rows";
import {
  PLAYGROUND_PAGE_SHAPES,
  type PlaygroundPageShape,
} from "@/features/playground/playground-page-shape";

export const HITL_VIEW_MODES = ["live", "static"] as const;
export type HitlViewMode = (typeof HITL_VIEW_MODES)[number];

export const HITL_CATEGORY_FILTERS = [
  "all",
  "auth",
  "admin",
  "client",
  "dynamic",
  "fft",
  "auto",
] as const;
export type HitlCategoryFilter = (typeof HITL_CATEGORY_FILTERS)[number];

export const HITL_SHAPE_FILTERS = ["all", ...PLAYGROUND_PAGE_SHAPES] as const;
export type HitlShapeFilter = (typeof HITL_SHAPE_FILTERS)[number];

export const HITL_ATTENTION_FILTERS = [
  "all",
  "needs-review",
  "verified",
  "repair",
  "blocked",
] as const;
export type HitlAttentionFilter = (typeof HITL_ATTENTION_FILTERS)[number];

/** List = inventory. Inspect = shape-first panel (RSC mount only when live + loader). */
export const HITL_STATIC_PRESENTS = ["list", "inspect"] as const;
export type HitlStaticPresent = (typeof HITL_STATIC_PRESENTS)[number];

export const HITL_STATIC_PRESENT_LABEL: Record<HitlStaticPresent, string> = {
  list: "List",
  inspect: "Inspect",
};

export type HitlViewFilters = {
  view: HitlViewMode;
  cat: HitlCategoryFilter;
  shape: HitlShapeFilter;
  attention: HitlAttentionFilter;
  /** Static only — list inventory vs shape-first inspect. */
  present: HitlStaticPresent;
  /** Screen id for Static Inspect. */
  screen: string | null;
};

/** Live mode default when `shape` is unset — focus product + redirect errors. */
export const HITL_LIVE_DEFAULT_SHAPES: readonly PlaygroundPageShape[] = [
  "live",
  "redirect",
];

export const HITL_LIVE_BATCH_SIZE = 4;
export const HITL_LIVE_HARD_CAP = 12;

export const HITL_CATEGORY_FILTER_LABEL: Record<HitlCategoryFilter, string> = {
  all: "All",
  auth: "Auth",
  admin: "Admin",
  client: "Client",
  dynamic: "Dynamic",
  "fft": "Feed Farm Trade",
  auto: "Auto-discovered",
};

export const HITL_SHAPE_FILTER_LABEL: Record<HitlShapeFilter, string> = {
  all: "All shapes",
  live: "Live",
  redirect: "Redirect",
  stub: "Stub",
  closed: "Closed",
  "fixture-gap": "Fixture gap",
};

export const HITL_ATTENTION_FILTER_LABEL: Record<HitlAttentionFilter, string> = {
  all: "All review states",
  "needs-review": "Needs human review",
  verified: "Verified as expected",
  repair: "Repair required",
  blocked: "Blocked / unclassified",
};

export function isAuthHitlRow(row: Pick<PlaygroundHitlRow, "path">): boolean {
  const [pathname] = row.path.split("?");
  return (
    pathname === "/org/login" ||
    pathname === "/client/login" ||
    pathname === "/auth/admin" ||
    pathname.startsWith("/auth/")
  );
}

function isHitlViewMode(value: string | null): value is HitlViewMode {
  return HITL_VIEW_MODES.includes(value as HitlViewMode);
}

function isHitlCategoryFilter(
  value: string | null,
): value is HitlCategoryFilter {
  return HITL_CATEGORY_FILTERS.includes(value as HitlCategoryFilter);
}

function isHitlShapeFilter(value: string | null): value is HitlShapeFilter {
  return HITL_SHAPE_FILTERS.includes(value as HitlShapeFilter);
}

function isHitlAttentionFilter(
  value: string | null,
): value is HitlAttentionFilter {
  return HITL_ATTENTION_FILTERS.includes(value as HitlAttentionFilter);
}

export type HitlViewSearchParams = {
  view?: string | string[];
  cat?: string | string[];
  shape?: string | string[];
  attention?: string | string[];
  present?: string | string[];
  screen?: string | string[];
};

function firstParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function isHitlStaticPresent(
  value: string | null,
): value is HitlStaticPresent {
  return HITL_STATIC_PRESENTS.includes(value as HitlStaticPresent);
}

/**
 * Parse URL search params. When `view=live` and `shape` is omitted,
 * default shape focus is live+redirect (encoded as shape=all with liveFocus).
 * Explicit `shape=all` means all shapes.
 */
export function parseHitlViewFilters(
  params: HitlViewSearchParams,
): HitlViewFilters & { liveShapeFocus: boolean } {
  const viewRaw = firstParam(params.view);
  const catRaw = firstParam(params.cat);
  const shapeRaw = firstParam(params.shape);
  const attentionRaw = firstParam(params.attention);
  const presentRaw = firstParam(params.present);
  const screenRaw = firstParam(params.screen);

  const view: HitlViewMode = isHitlViewMode(viewRaw) ? viewRaw : "static";
  const cat: HitlCategoryFilter = isHitlCategoryFilter(catRaw)
    ? catRaw
    : "all";

  const shapeExplicit = shapeRaw !== null;
  const shape: HitlShapeFilter = isHitlShapeFilter(shapeRaw)
    ? shapeRaw
    : "all";
  const attention: HitlAttentionFilter = isHitlAttentionFilter(attentionRaw)
    ? attentionRaw
    : "all";

  const liveShapeFocus = view === "live" && !shapeExplicit;

  // Legacy URL: present=composition → inspect
  const presentNormalized =
    presentRaw === "composition" ? "inspect" : presentRaw;
  const present: HitlStaticPresent =
    view === "static" && isHitlStaticPresent(presentNormalized)
      ? presentNormalized
      : "list";

  const screen =
    view === "static" && present === "inspect" && screenRaw?.trim()
      ? screenRaw.trim()
      : null;

  return { view, cat, shape, attention, present, screen, liveShapeFocus };
}

export function serializeHitlViewFilters(
  filters: HitlViewFilters,
  options?: { liveShapeFocus?: boolean },
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("view", filters.view);
  if (filters.cat !== "all") {
    params.set("cat", filters.cat);
  }
  if (filters.attention !== "all") {
    params.set("attention", filters.attention);
  }

  if (filters.view === "static") {
    if (filters.present === "inspect") {
      params.set("present", "inspect");
      if (filters.screen) {
        params.set("screen", filters.screen);
      }
    }
    if (filters.shape !== "all") {
      params.set("shape", filters.shape);
    }
    return params;
  }

  // Live: omit shape when default live+redirect focus applies.
  if (options?.liveShapeFocus) {
    return params;
  }
  if (filters.shape !== "all") {
    params.set("shape", filters.shape);
  }
  return params;
}

export function filterHitlRows(
  rows: PlaygroundHitlRow[],
  filters: HitlViewFilters,
  options?: {
    liveShapeFocus?: boolean;
    reviews?: PlaygroundHitlReviews;
  },
): PlaygroundHitlRow[] {
  return rows.filter((row) => {
    if (filters.cat === "auth") {
      if (!isAuthHitlRow(row)) {
        return false;
      }
    } else if (filters.cat !== "all" && row.category !== filters.cat) {
      return false;
    }

    if (
      options?.liveShapeFocus &&
      !HITL_LIVE_DEFAULT_SHAPES.includes(row.shape)
    ) {
      return false;
    }

    if (filters.shape !== "all" && row.shape !== filters.shape) {
      return false;
    }

    if (
      filters.attention !== "all" &&
      resolvePlaygroundHitlAttention(row, options?.reviews ?? {}) !==
        filters.attention
    ) {
      return false;
    }

    return true;
  });
}

/** Rows that may mount an iframe in Live mode. */
export function hitlRowsEligibleForLiveEmbed(
  rows: PlaygroundHitlRow[],
): PlaygroundHitlRow[] {
  return rows.filter(
    (row) =>
      row.pathConfigured &&
      row.shape !== "fixture-gap" &&
      Boolean(row.embedHref),
  );
}

export function buildHitlReviewHref(filters: HitlViewFilters, options?: {
  liveShapeFocus?: boolean;
}): string {
  const params = serializeHitlViewFilters(filters, options);
  const query = params.toString();
  return query
    ? `/playground/hitl-review?${query}`
    : "/playground/hitl-review";
}
