import {
  PLAYGROUND_COVERAGE_HREF,
  PLAYGROUND_HITL_REVIEW_HREF,
  playgroundScreenHref,
} from "@/modules/platform/routing/portal-routes";

export {
  PLAYGROUND_COVERAGE_HREF,
  PLAYGROUND_HITL_REVIEW_HREF,
  PLAYGROUND_HREF,
} from "@/modules/platform/routing/portal-routes";

export const playgroundReviewNavLinks = [
  {
    href: PLAYGROUND_COVERAGE_HREF,
    label: "Route coverage",
    id: "coverage",
  },
  {
    href: PLAYGROUND_HITL_REVIEW_HREF,
    label: "Route review",
    id: "hitl-review",
  },
  {
    href: playgroundScreenHref("admin-dashboard"),
    label: "Iframe previews",
    id: "iframe-previews",
  },
] as const;
