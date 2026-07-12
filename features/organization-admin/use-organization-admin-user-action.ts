"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

export function getActionError(
  result: ActionResult<unknown> | null | undefined,
): string | null {
  if (!result) return null;
  if (result.ok === false) {
    return result.message || null;
  }
  return null;
}

/**
 * Shared pending/error wrapper for organization-admin user mutations.
 * Actions return ActionResult only (no legacy `{ error }` dual-parse).
 */
export function useOrganizationAdminUserAction() {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runUserAction = (action: () => Promise<ActionResult<unknown>>) => {
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
