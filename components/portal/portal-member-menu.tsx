"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
import { authClient, signOutToAuthEntry } from "@/lib/auth/client";
import {
  PORTAL_ACCOUNT_SECURITY_HREF,
  resolveAccountSettingsHref,
  resolveAccountSettingsLabel,
} from "@/lib/routing/account-paths";
import {
  memberInitials,
  resolvePortalMemberFromSession,
  type PortalMember,
} from "@/lib/portal-member-types";
import { usePortalMember } from "@/components/portal/portal-member-context";
import { portalCopy } from "@/lib/copy/portal-copy";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Account menu — display name/email from server-synced Neon Auth + portal profile. */
export function PortalMemberMenu({
  member: memberProp,
}: {
  member?: PortalMember | null;
}) {
  const synced = usePortalMember() ?? memberProp;
  const { clientDashboard, userMenu } = portalCopy;
  const { data: session } = authClient.useSession();
  const [isPending, startTransition] = useTransition();

  const member = resolvePortalMemberFromSession(synced, session?.user);
  if (!member) {
    return null;
  }

  const initials = memberInitials(member.displayName, member.email);
  const settingsHref = resolveAccountSettingsHref(member.context);
  const securityHref = PORTAL_ACCOUNT_SECURITY_HREF;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Account menu"
            disabled={isPending}
            className="size-7 rounded-full p-0"
          />
        }
      >
        <Avatar className="size-7">
          <AvatarFallback className="text-nano font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">
                  {member.displayName}
                </p>
                {member.isPreviewSession ? (
                  <Badge variant="secondary" className="shrink-0 text-nano">
                    Preview
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {userMenu.signedInAs} {member.email}
              </p>
              <p className="text-xs text-muted-foreground">{member.subtitle}</p>
              {member.profile?.fullLegalName &&
              member.authName &&
              member.profile.fullLegalName.trim() !== member.authName.trim() ? (
                <p className="text-micro text-muted-foreground">
                  Auth profile: {member.authName}
                </p>
              ) : null}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={settingsHref} />}>
          <SettingsIcon aria-hidden="true" />
          {resolveAccountSettingsLabel(member.context)}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={securityHref} />}>
          <ShieldIcon aria-hidden="true" />
          {userMenu.accountSecurity}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            startTransition(() => {
              void signOutToAuthEntry();
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
