import { NextResponse } from "next/server";

/**
 * Shared helpers for `/api/health/*` route handlers.
 * Route segment config (`runtime`, `dynamic`) must be declared inline in each `route.ts`.
 */

/** Shared cache policy for operational health probes. */
export const HEALTH_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

/** JSON envelope returned by all `/api/health/*` handlers. */
export type HealthEnvelope<T extends Record<string, unknown>> = {
  data: T;
};

export function healthJson<T extends Record<string, unknown>>(
  data: T,
  init?: ResponseInit,
) {
  const payload: HealthEnvelope<T> = { data };

  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...HEALTH_NO_STORE_HEADERS,
      ...init?.headers,
    },
  });
}
