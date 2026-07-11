"use client";

import { useTransition, useState } from "react";

type ActionResult = { error?: string; ok?: true };

/**
 * Shared pending/error wrapper for organization-admin user mutations.
 */
export function useOrganizationAdminUserAction() {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runUserAction = (action: () => Promise<ActionResult>) => {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        setActionError(result.error);
      }
    });
  };

  return { actionError, isPending, runUserAction, setActionError };
}
