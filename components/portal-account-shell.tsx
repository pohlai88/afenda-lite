import type { ReactNode } from "react";
import Link from "next/link";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalMemberProvider } from "@/components/portal-member-context";
import { PortalMemberMenu } from "@/components/portal-member-menu";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { Button } from "@/components/ui/button";
import type { PortalMember } from "@/lib/portal-member-types";
import { resolveAccountShellBack } from "@/lib/account-paths";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";

export function PortalAccountShell({
  member,
  children,
}: {
  member: PortalMember;
  children: ReactNode;
}) {
  const { account, clientDashboard, org } = portalCopy;
  const isOperator = member.context === "operator";
  const shellEyebrow = isOperator ? org.eyebrow : clientDashboard.eyebrow;
  const shellTitle = isOperator ? org.title : clientDashboard.title;
  const { href: backHref, label: backLabel } = resolveAccountShellBack(
    member.context,
  );

  return (
    <PortalMemberProvider member={member}>
      <div className="portal-shell">
        <a href="#account-content" className="portal-skip-link">
          {account.skipLink}
        </a>

        <header className="portal-header">
          <div className={cn("portal-header-inner", "portal-content-account")}>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground" translate="no">
                {PORTAL_NAME}
              </p>
              <PortalEyebrow className="mb-1">{shellEyebrow}</PortalEyebrow>
              <p className="portal-toolbar-title">{shellTitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                render={<Link href={backHref} />}
                nativeButton={false}
              >
                {backLabel}
              </Button>
              <PortalThemeToggle />
              <PortalMemberMenu />
            </div>
          </div>
        </header>

        <main
          id="account-content"
          className={cn("portal-main", "portal-content-account", "space-y-6")}
        >
          {children}
        </main>
      </div>
    </PortalMemberProvider>
  );
}
