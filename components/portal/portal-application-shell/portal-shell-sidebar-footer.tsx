"use client";

import { PortalMemberMenu } from "@/components/portal/portal-member-menu";
import { PortalThemeToggle } from "@/components/portal/portal-theme-toggle";

export function PortalShellSidebarFooter() {
  return (
    <div className="portal-sidebar-footer flex w-full items-center justify-between gap-2 px-2 py-2">
      <PortalMemberMenu />
      <PortalThemeToggle />
    </div>
  );
}
