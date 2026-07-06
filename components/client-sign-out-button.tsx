"use client";

import { useTransition } from "react";
import { authClient } from "@/lib/auth/client";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";

export function ClientSignOutButton() {
  const { clientDashboard } = portalCopy;
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await authClient.signOut();
          window.location.href = "/";
        });
      }}
    >
      {clientDashboard.signOut}
    </Button>
  );
}
