"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

function SidebarLinkSkeleton({ width = "70%" }: { width?: string }) {
  return (
    <SidebarMenuItem>
      <div className="flex h-8 items-center gap-2 rounded-md px-2">
        <Skeleton className="size-4 shrink-0 rounded-md" />
        <Skeleton className="h-4 flex-1" style={{ maxWidth: width }} />
      </div>
    </SidebarMenuItem>
  );
}

export function AppSidebarSkeleton() {
  return (
    <Sidebar collapsible="icon" aria-hidden>
      <SidebarHeader>
        <Skeleton className="h-12 w-full rounded-lg" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quick links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarLinkSkeleton width="62%" />
              <SidebarLinkSkeleton width="74%" />
              <SidebarLinkSkeleton width="58%" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarLinkSkeleton width="68%" />
              <SidebarLinkSkeleton width="54%" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
