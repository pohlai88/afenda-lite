"use client";

import type { ReactNode } from "react";
import { ClientSidebar } from "@/components/client-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function ClientShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delay={0}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "16rem",
          } as React.CSSProperties
        }
      >
        <ClientSidebar />
        <SidebarInset className="min-h-svh min-w-0 overflow-x-hidden">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
