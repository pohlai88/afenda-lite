"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EyeIcon } from "lucide-react";
import { startClientPreviewAction } from "@/app/actions/admin";
import { NavMain } from "@/components/nav-main";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { TeamSwitcher } from "@/components/team-switcher";
import { UserButton } from "@/components/user-button";
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
  dashboardTeams,
  getDashboardNavGroups,
  getDashboardQuickLinks,
  isNavItemActive,
} from "@/lib/dashboard-nav";
import { portalCopy } from "@/lib/portal-copy";

export function AppSidebar({
  showPreviewClient = false,
  showPlayground = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  showPreviewClient?: boolean;
  showPlayground?: boolean;
}) {
  const pathname = usePathname();
  const { nav } = portalCopy;
  const quickLinks = getDashboardQuickLinks({ showPlayground });
  const navGroups = getDashboardNavGroups({ showPlayground });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={dashboardTeams} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quick links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickLinks.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={isNavItemActive(pathname, item.url)}
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {showPreviewClient ? (
                <SidebarMenuItem>
                  <form action={startClientPreviewAction}>
                    <SidebarMenuButton type="submit" tooltip={nav.previewClientPortal}>
                      <EyeIcon aria-hidden="true" />
                      <span>{nav.previewClientPortal}</span>
                    </SidebarMenuButton>
                  </form>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavMain groups={navGroups} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="h-stack items-center justify-between gap-2 px-2 py-2 group-data-[collapsible=icon]:v-stack">
          <UserButton />
          <PortalThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
