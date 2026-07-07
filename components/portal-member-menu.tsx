"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import {
  PORTAL_ACCOUNT_SECURITY_HREF,
  PORTAL_ACCOUNT_SETTINGS_HREF,
} from "@/lib/account-paths";
import { CLIENT_PROFILE_HREF } from "@/lib/portal-routes";
import { fallbackOperatorMember, memberInitials, type PortalMember } from "@/lib/portal-member-types";
import { usePortalMember } from "@/components/portal-member-context";
import { portalCopy } from "@/lib/portal-copy";
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

function resolveMember(
  synced: PortalMember | null | undefined,
  sessionUser: { name?: string | null; email?: string | null; role?: string | null; id?: string } | undefined,
): PortalMember | null {
  if (synced) {
    return synced;
  }

  if (!sessionUser?.id || !sessionUser.email) {
    return null;
  }

  return {
    userId: sessionUser.id,
    email: sessionUser.email,
    authName: sessionUser.name ?? null,
    displayName: sessionUser.name?.trim() || sessionUser.email,
    subtitle: sessionUser.role === "admin" ? portalCopy.nav.organization : portalCopy.clientDashboard.eyebrow,
    role: sessionUser.role ?? null,
    context: sessionUser.role === "admin" ? "operator" : "client",
    isPreviewSession: false,
    profile: null,
  };
}

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

  const member = resolveMember(synced, session?.user);
  if (!member) {
    return null;
  }

  const initials = memberInitials(member.displayName, member.email);
  const settingsHref =
    member.context === "client" ? CLIENT_PROFILE_HREF : PORTAL_ACCOUNT_SETTINGS_HREF;
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
          {member.context === "client"
            ? portalCopy.clientNav.declarantProfile
            : userMenu.accountSettings}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={securityHref} />}>
          <ShieldIcon aria-hidden="true" />
          {userMenu.accountSecurity}
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
