/** Canonical App Router API paths — keep client fetch targets in sync. */
export const HEALTH_LIVENESS_API_HREF = "/api/health/liveness" as const;
export const HEALTH_READINESS_API_HREF = "/api/health/readiness" as const;
export const CLIENT_DECLARATION_DRAFT_API_HREF =
  "/api/client/declaration-draft" as const;

/** Import constant → reliance action id (keepalive / JSON route handlers). */
export const API_ROUTE_ACTION_IDS = {
  CLIENT_DECLARATION_DRAFT_API_HREF: "action:postClientDeclarationDraftApi",
} as const satisfies Record<
  | "CLIENT_DECLARATION_DRAFT_API_HREF",
  `action:${string}`
>;
