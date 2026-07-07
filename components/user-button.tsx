"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserButton() {
  const { clientDashboard } = portalCopy;
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Account menu"
            disabled={isPending}
          />
        }
      >
        <span className="text-xs font-semibold">iAM</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href="/account/settings" />}>
          <SettingsIcon aria-hidden="true" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            startTransition(async () => {
              await authClient.signOut();
              window.location.href = "/auth/sign-in";
            });
          }}
        >
          <LogOutIcon aria-hidden="true" />
          {clientDashboard.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
