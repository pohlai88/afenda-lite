import { NextResponse } from "next/server";
import type { ClientSessionGuardReason } from "@/lib/auth/session";
import { portalCopy } from "@/lib/copy/portal-copy";

export function apiError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export function mapClientSessionGuardToHttp(reason: ClientSessionGuardReason): {
  status: 401 | 403;
  error: string;
} {
  switch (reason) {
    case "unauthenticated":
      return { status: 401, error: "Unauthorized" };
    case "operator":
      return { status: 403, error: "Forbidden" };
    case "onboarding_incomplete":
      return {
        status: 403,
        error: portalCopy.clientOnboarding.title,
      };
    case "preview_unavailable":
      return {
        status: 403,
        error: portalCopy.previewClient.notConfiguredTitle,
      };
  }
}
