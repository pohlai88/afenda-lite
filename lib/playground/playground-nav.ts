export const PLAYGROUND_HREF = "/playground" as const;
export const PLAYGROUND_HITL_REVIEW_HREF = "/playground/hitl-review" as const;
export const PLAYGROUND_COVERAGE_HREF = "/playground/coverage" as const;

function playgroundScreenHref(screenId: string) {
  return `/playground/${screenId}`;
}

export const playgroundReviewNavLinks = [
  {
    href: PLAYGROUND_COVERAGE_HREF,
    label: "Route coverage",
    id: "coverage",
  },
  {
    href: PLAYGROUND_HITL_REVIEW_HREF,
    label: "HITL checklist",
    id: "hitl-review",
  },
  {
    href: playgroundScreenHref("admin-dashboard"),
    label: "Iframe previews",
    id: "iframe-previews",
  },
] as const;
