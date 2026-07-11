import { NextResponse } from "next/server";
import type { ClientSessionGuardReason } from "@/modules/identity/auth/session";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  apiErrorCodeForStatus,
  type ApiErrorCode,
  type APIErrorBody,
} from "@/modules/platform/schemas/api-error";

export type ApiErrorInput = {
  status: number;
  code?: ApiErrorCode;
  message: string;
  details?: unknown;
};

/** Contract error JSON for Route Handlers (`doc/api/03-error-contract`). */
export function apiError(input: ApiErrorInput) {
  const body: APIErrorBody = {
    error: {
      code: input.code ?? apiErrorCodeForStatus(input.status),
      message: input.message,
      ...(input.details !== undefined ? { details: input.details } : {}),
    },
  };
  return NextResponse.json(body, { status: input.status });
}

/** Success envelope aligned with health `{ data }` shape. */
export function apiData<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function mapClientSessionGuardToHttp(reason: ClientSessionGuardReason): {
  status: 401 | 403;
  code: ApiErrorCode;
  message: string;
} {
  switch (reason) {
    case "unauthenticated":
      return { status: 401, code: "UNAUTHORIZED", message: "Unauthorized" };
    case "organizationAdmin":
      return { status: 403, code: "FORBIDDEN", message: "Forbidden" };
    case "onboarding_incomplete":
      return {
        status: 403,
        code: "FORBIDDEN",
        message: portalCopy.clientOnboarding.title,
      };
    case "preview_unavailable":
      return {
        status: 403,
        code: "FORBIDDEN",
        message: portalCopy.previewClient.notConfiguredTitle,
      };
  }
}
