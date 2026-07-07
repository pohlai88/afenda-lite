import type { ReactNode } from "react";
import Link from "next/link";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalMemberProvider } from "@/components/portal-member-context";
import { PortalMemberMenu } from "@/components/portal-member-menu";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { Button } from "@/components/ui/button";
import type { PortalMember } from "@/lib/portal-member-types";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/portal-routes";
import { cn } from "@/lib/utils";

export function PortalAccountShell({
  member,
  children,
}: {
  member: PortalMember;
  children: ReactNode;
}) {
  const { account, org } = portalCopy;

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
              <PortalEyebrow className="mb-1">{org.eyebrow}</PortalEyebrow>
              <p className="portal-toolbar-title">{org.title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                render={<Link href={OPERATOR_DASHBOARD_HREF} />}
                nativeButton={false}
              >
                {account.backToDashboard}
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
