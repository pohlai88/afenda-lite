/** Canonical App Router API paths — keep client fetch targets in sync. */
export const HEALTH_LIVENESS_API_HREF = "/api/health/liveness" as const;
export const HEALTH_READINESS_API_HREF = "/api/health/readiness" as const;
export const CLIENT_DECLARATION_DRAFT_API_HREF =
  "/api/client/declaration-draft" as const;

/** Observability + reliance action label for keepalive draft route handler. */
export const POST_CLIENT_DECLARATION_DRAFT_API_ACTION =
  "postClientDeclarationDraftApi" as const;

/** Import constant → reliance action id (keepalive / JSON route handlers). */
export const API_ROUTE_ACTION_IDS = {
  CLIENT_DECLARATION_DRAFT_API_HREF: `action:${POST_CLIENT_DECLARATION_DRAFT_API_ACTION}`,
} as const satisfies Record<
  | "CLIENT_DECLARATION_DRAFT_API_HREF",
  `action:${string}`
>;
