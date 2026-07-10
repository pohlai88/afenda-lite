"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ApplicationShell05SidebarSkeleton() {
  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      aria-hidden
      className={cn("p-6 pr-0 *:data-[slot=sidebar-inner]:group-data-[variant=floating]:rounded-xl")}
    >
      <SidebarHeader>
        <Skeleton className="h-12 w-full rounded-lg" />
      </SidebarHeader>
      <SidebarContent className="space-y-4 px-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-3/4 rounded-md" />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
