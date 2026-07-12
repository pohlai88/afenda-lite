"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { ActionResult as PlatformActionResult } from "@/modules/platform/schemas/action-result";

type LegacyActionResult = {
  error?: string;
  ok?: boolean;
  message?: string;
  code?: string;
  data?: unknown;
  removed?: number;
  banned?: number;
  created?: number;
  failed?: number;
  failures?: Array<{ email: string; error: string }>;
};

export function getActionError(
  result: PlatformActionResult<unknown> | LegacyActionResult | null | undefined,
): string | null {
  if (!result) return null;
  if ("ok" in result && result.ok === false) {
    if (typeof result.message === "string" && result.message) {
      return result.message;
    }
  }
  if (
    "error" in result &&
    typeof result.error === "string" &&
    result.error.length > 0
  ) {
    return result.error;
  }
  return null;
}

/**
 * Shared pending/error wrapper for organization-admin user mutations.
 */
export function useOrganizationAdminUserAction() {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runUserAction = (
    action: () => Promise<
      PlatformActionResult<unknown> | LegacyActionResult
    >,
  ) => {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      const error = getActionError(result);
      if (error) {
        setActionError(error);
        return;
      }
      router.refresh();
    });
  };

  return { actionError, isPending, runUserAction, setActionError };
}
