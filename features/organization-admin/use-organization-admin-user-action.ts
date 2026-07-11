"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

type ActionResult = {
  error?: string;
  ok?: boolean;
  message?: string;
  removed?: number;
  banned?: number;
  created?: number;
  failed?: number;
  failures?: Array<{ email: string; error: string }>;
};

export function getActionError(
  result: ActionResult | null | undefined,
): string | null {
  if (!result) return null;
  if (result.ok === false && typeof result.message === "string" && result.message) {
    return result.message;
  }
  if (typeof result.error === "string" && result.error.length > 0) {
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

  const runUserAction = (action: () => Promise<ActionResult>) => {
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
