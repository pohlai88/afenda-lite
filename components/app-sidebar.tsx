"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EyeIcon } from "lucide-react";
import { startClientPreviewAction } from "@/app/actions/admin";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { TeamSwitcher } from "@/components/team-switcher";
import { PortalMemberMenu } from "@/components/portal-member-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  fallbackDashboardTeams,
  getOrgOperatorSidebarItems,
  isNavItemActive,
  type DashboardTeam,
} from "@/lib/dashboard-nav";
import { portalCopy } from "@/lib/portal-copy";

export function AppSidebar({
  teams: teamsProp,
  showPreviewClient = false,
  showPlayground = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  teams?: DashboardTeam[];
  showPreviewClient?: boolean;
  showPlayground?: boolean;
}) {
  const pathname = usePathname();
  const { nav } = portalCopy;
  const navItems = getOrgOperatorSidebarItems({ showPlayground });
  const teams = teamsProp ?? fallbackDashboardTeams;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <TeamSwitcher teams={teams} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{nav.organization}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={isNavItemActive(pathname, item.url)}
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                  >
                    {item.icon}
                    <span className="truncate">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {showPreviewClient ? (
                <SidebarMenuItem>
                  <form action={startClientPreviewAction}>
                    <SidebarMenuButton type="submit" tooltip={nav.previewClientPortal}>
                      <EyeIcon aria-hidden="true" />
                      <span className="truncate">{nav.previewClientPortal}</span>
                    </SidebarMenuButton>
                  </form>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="portal-sidebar-footer h-stack items-center justify-between gap-2 px-2 py-2 group-data-[collapsible=icon]:v-stack">
          <PortalMemberMenu />
          <PortalThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
