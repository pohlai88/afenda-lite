"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGridIcon } from "lucide-react";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
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
import { PORTAL_BRAND_SHELL } from "@/lib/portal-brand";
import type { PlaygroundScreen } from "@/lib/playground";
import { playgroundScreenHref } from "@/lib/portal-routes";

function PlaygroundNavGroup({
  label,
  screens,
  activeId,
}: {
  label: string;
  screens: PlaygroundScreen[];
  activeId?: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {screens.map((screen) => (
            <SidebarMenuItem key={screen.id}>
              <SidebarMenuButton
                isActive={screen.id === activeId}
                render={<Link href={playgroundScreenHref(screen.id)} />}
                tooltip={screen.label}
              >
                <span>{screen.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function PlaygroundSidebar({
  adminScreens,
  clientScreens,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  adminScreens: PlaygroundScreen[];
  clientScreens: PlaygroundScreen[];
}) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/playground/")
    ? pathname.replace("/playground/", "").split("/")[0]
    : undefined;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/playground" />}
              tooltip="Playground"
            >
              <div className={PORTAL_BRAND_SHELL.slot}>
                <LayoutGridIcon className="size-4" aria-hidden="true" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">Playground</span>
                <span className="truncate text-xs text-muted-foreground">
                  UI review
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <PlaygroundNavGroup
          label="Admin"
          screens={adminScreens}
          activeId={activeId}
        />
        <PlaygroundNavGroup
          label="Client"
          screens={clientScreens}
          activeId={activeId}
        />
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
