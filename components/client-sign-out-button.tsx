"use client";

import Link from "next/link";
import { useTransition } from "react";
import { SettingsIcon } from "lucide-react";
import { signOutToAuthEntry } from "@/lib/auth/client";
import { PORTAL_ACCOUNT_SECURITY_HREF } from "@/lib/account-paths";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";

export function ClientSignOutButton() {
  const { clientDashboard } = portalCopy;
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full touch-manipulation justify-start"
        render={<Link href={PORTAL_ACCOUNT_SECURITY_HREF} />}
        nativeButton={false}
      >
        <SettingsIcon aria-hidden="true" className="size-4" />
        Account & password
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full touch-manipulation"
        disabled={isPending}
        onClick={() => {
          startTransition(() => {
            void signOutToAuthEntry();
          });
        }}
      >
        {clientDashboard.signOut}
      </Button>
    </div>
  );
}
