import {
  buildPlaygroundEmbedUrl,
  isPlaygroundScreenPathConfigured,
  resolvePlaygroundRouteFile,
} from "@/features/playground/playground-registry";
import type { PlaygroundScreen } from "@/features/playground/playground";
import {
  countPlaygroundPageShapes,
  declaredPlaygroundPageShape,
  resolvePlaygroundPageShape,
  type PlaygroundPageShape,
} from "@/features/playground/playground-page-shape";
import {
  getPlaygroundRouteReview,
  type PlaygroundRouteReviewDefinition,
} from "@/features/playground/playground-route-review";
import { playgroundScreenHref } from "@/modules/platform/routing/portal-routes";

export type PlaygroundHitlRow = {
  id: string;
  category: PlaygroundScreen["category"];
  label: string;
  path: string;
  routeFile: string | null;
  pathConfigured: boolean;
  /** Effective page shape for live-route review (fixture-gap overrides). */
  shape: PlaygroundPageShape;
  review: PlaygroundRouteReviewDefinition | null;
  playgroundHref: string;
  embedHref: string;
};

export function buildPlaygroundHitlRows(
  screens: PlaygroundScreen[],
): PlaygroundHitlRow[] {
  return screens.map((screen) => {
    const pathConfigured = isPlaygroundScreenPathConfigured(screen.path);
    const shape = resolvePlaygroundPageShape(
      declaredPlaygroundPageShape(screen.id),
      pathConfigured,
    );
    const review = getPlaygroundRouteReview(screen.id);

    return {
      id: screen.id,
      category: screen.category,
      label: screen.label,
      path: screen.path,
      routeFile:
        screen.routeFile ?? resolvePlaygroundRouteFile(screen.path) ?? null,
      pathConfigured,
      shape,
      review,
      playgroundHref: playgroundScreenHref(screen.id),
      embedHref: buildPlaygroundEmbedUrl(screen.path),
    };
  });
}

export function countPlaygroundHitlShapes(rows: PlaygroundHitlRow[]) {
  return countPlaygroundPageShapes(rows.map((row) => row.shape));
}

export const PLAYGROUND_HITL_STORAGE_KEY = "portal-playground-hitl-v1";
export const PLAYGROUND_HITL_CHANGE_EVENT = "portal-playground-hitl-change";
export const PLAYGROUND_HITL_NOTE_MAX_LENGTH = 4_000;

export type PlaygroundHitlVerdict = "matches" | "needs-repair";
export type PlaygroundHitlMark =
  | "pending"
  | PlaygroundHitlVerdict
  | "obsolete";

export type PlaygroundHitlReviewRecord = {
  fingerprint: string;
  reviewedAt: string;
  verdict?: PlaygroundHitlVerdict;
  note?: string;
};

export type PlaygroundHitlReviews = Record<string, PlaygroundHitlReviewRecord>;
export type PlaygroundHitlAttention =
  | "needs-review"
  | "verified"
  | "repair"
  | "blocked";

type HitlStorageV3 = {
  version: 3;
  reviews: PlaygroundHitlReviews;
};

type HitlStorageV2 = {
  version: 2;
  reviews: PlaygroundHitlReviews;
};

export function buildPlaygroundHitlFingerprint(
  path: string,
  pathConfigured: boolean,
  shape?: PlaygroundPageShape,
  review?: PlaygroundRouteReviewDefinition | null,
): string {
  return JSON.stringify([
    "v3",
    path,
    pathConfigured,
    shape ?? null,
    review
      ? {
          purpose: review.purpose,
          primary: review.primary,
          alternates: review.alternates ?? [],
          action: review.action,
          evidence: review.evidence,
        }
      : null,
  ]);
}

export function resolvePlaygroundHitlMark(
  record: PlaygroundHitlReviewRecord | undefined,
  fingerprint: string,
): PlaygroundHitlMark {
  if (!record) {
    return "pending";
  }

  if (record.fingerprint !== fingerprint) {
    return "obsolete";
  }

  return record.verdict ?? "pending";
}

function isReviewRecord(value: unknown): value is PlaygroundHitlReviewRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<PlaygroundHitlReviewRecord>;
  return (
    typeof record.fingerprint === "string" &&
    typeof record.reviewedAt === "string" &&
    (record.verdict === undefined ||
      record.verdict === "matches" ||
      record.verdict === "needs-repair") &&
    (record.note === undefined || typeof record.note === "string")
  );
}

function readStoredReviewMap(value: unknown): PlaygroundHitlReviews {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, record]) => isReviewRecord(record)),
  );
}

export function parsePlaygroundHitlReviews(
  raw: string | null,
): PlaygroundHitlReviews {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    if ("version" in parsed && (parsed as HitlStorageV3).version === 3) {
      return readStoredReviewMap((parsed as HitlStorageV3).reviews);
    }

    if ("version" in parsed && (parsed as HitlStorageV2).version === 2) {
      return readStoredReviewMap((parsed as HitlStorageV2).reviews);
    }

    // Legacy boolean map → obsolete until re-confirmed against a fingerprint.
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => value === true)
        .map(([id]) => [
          id,
          {
            fingerprint: "",
            reviewedAt: new Date(0).toISOString(),
          } satisfies PlaygroundHitlReviewRecord,
        ]),
    );
  } catch {
    return {};
  }
}

/** Reads HITL reviews; old fingerprints remain obsolete until re-reviewed. */
export function readPlaygroundHitlReviews(): PlaygroundHitlReviews {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return parsePlaygroundHitlReviews(
      window.localStorage.getItem(PLAYGROUND_HITL_STORAGE_KEY),
    );
  } catch {
    return {};
  }
}

export function writePlaygroundHitlReviews(reviews: PlaygroundHitlReviews) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: HitlStorageV3 = { version: 3, reviews };
    window.localStorage.setItem(
      PLAYGROUND_HITL_STORAGE_KEY,
      JSON.stringify(payload),
    );
    window.dispatchEvent(new Event(PLAYGROUND_HITL_CHANGE_EVENT));
  } catch {
    // HITL evidence is a local convenience; unavailable storage must not crash UI.
  }
}

export function setPlaygroundHitlReview(
  reviews: PlaygroundHitlReviews,
  screenId: string,
  fingerprint: string,
  update: {
    verdict?: PlaygroundHitlVerdict | null;
    note?: string;
  },
): PlaygroundHitlReviews {
  const next = { ...reviews };
  const previous = reviews[screenId];
  const noteRefreshesObsoleteReview =
    update.note !== undefined && previous?.fingerprint !== fingerprint;
  const verdict =
    update.verdict === undefined
      ? noteRefreshesObsoleteReview
        ? undefined
        : previous?.verdict
      : update.verdict ?? undefined;
  const note =
    update.note === undefined
      ? previous?.note
      : update.note.trim().slice(0, PLAYGROUND_HITL_NOTE_MAX_LENGTH) || undefined;

  if (!verdict && !note) {
    delete next[screenId];
    return next;
  }

  next[screenId] = {
    fingerprint,
    reviewedAt: new Date().toISOString(),
    verdict,
    note,
  };
  return next;
}

export function countPlaygroundHitlMarks(
  rows: Array<{
    id: string;
    path: string;
    pathConfigured: boolean;
    shape?: PlaygroundPageShape;
    review?: PlaygroundRouteReviewDefinition | null;
  }>,
  reviews: PlaygroundHitlReviews,
): Record<PlaygroundHitlMark, number> {
  const counts: Record<PlaygroundHitlMark, number> = {
    pending: 0,
    matches: 0,
    "needs-repair": 0,
    obsolete: 0,
  };

  for (const row of rows) {
    const fingerprint = buildPlaygroundHitlFingerprint(
      row.path,
      row.pathConfigured,
      row.shape,
      row.review,
    );
    counts[resolvePlaygroundHitlMark(reviews[row.id], fingerprint)] += 1;
  }

  return counts;
}

export function resolvePlaygroundHitlAttention(
  row: PlaygroundHitlRow,
  reviews: PlaygroundHitlReviews,
): PlaygroundHitlAttention {
  if (
    !row.pathConfigured ||
    !row.review ||
    row.review.action.kind === "blocked"
  ) {
    return "blocked";
  }

  const fingerprint = buildPlaygroundHitlFingerprint(
    row.path,
    row.pathConfigured,
    row.shape,
    row.review,
  );
  const mark = resolvePlaygroundHitlMark(reviews[row.id], fingerprint);

  if (mark === "needs-repair" || row.review.action.kind === "repair") {
    return "repair";
  }
  if (mark === "matches") {
    return "verified";
  }
  return "needs-review";
}

export function countPlaygroundHitlAttention(
  rows: PlaygroundHitlRow[],
  reviews: PlaygroundHitlReviews,
): Record<PlaygroundHitlAttention, number> {
  const counts: Record<PlaygroundHitlAttention, number> = {
    "needs-review": 0,
    verified: 0,
    repair: 0,
    blocked: 0,
  };

  for (const row of rows) {
    counts[resolvePlaygroundHitlAttention(row, reviews)] += 1;
  }

  return counts;
}
