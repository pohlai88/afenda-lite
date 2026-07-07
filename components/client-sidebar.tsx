"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClientSignOutButton } from "@/components/client-sign-out-button";
import { PortalBrandMark } from "@/components/portal-brand-mark";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
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
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export function ClientSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { clientNav } = portalCopy;
  const navItems = getClientNavItems();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/client" />}
              tooltip={PORTAL_NAME}
            >
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary">
                <PortalBrandMark size="xs" className="size-full ring-0" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium" translate="no">
                  {PORTAL_NAME}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {portalCopy.clientDashboard.eyebrow}
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
        <div className="flex flex-col gap-2 px-2 py-2 group-data-[collapsible=icon]:items-center">
          <ClientSignOutButton />
          <PortalThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
