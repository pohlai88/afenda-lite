"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalMemberMenu } from "@/components/portal/portal-member-menu";
import { usePortalMember } from "@/components/portal/portal-member-context";
import { SidebarBrandIcon } from "@/components/portal/portal-brand-mark";
import { PortalThemeToggle } from "@/components/portal/portal-theme-toggle";
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
import { getClientNavItems, isClientNavItemActive } from "@/lib/client-nav";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";

export function ClientSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const member = usePortalMember();
  const { clientNav } = portalCopy;
  const navItems = getClientNavItems();
  const headerTitle = member?.displayName ?? PORTAL_NAME;
  const headerSubtitle = member?.subtitle ?? portalCopy.clientDashboard.eyebrow;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/client" />}
              tooltip={headerTitle}
            >
              <SidebarBrandIcon />
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium" translate="no">
                  {headerTitle}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {headerSubtitle}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{clientNav.sectionLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={isClientNavItemActive(pathname, item.url)}
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
