"use client";

import { EyeIcon } from "lucide-react";
import { startClientPreviewAction } from "@/app/actions/admin";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { portalCopy } from "@/lib/copy/portal-copy";

export function OperatorPreviewClientNavAction() {
  const { nav } = portalCopy;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <form action={startClientPreviewAction}>
          <SidebarMenuButton type="submit">
            <EyeIcon aria-hidden="true" />
            <span className="truncate">{nav.previewClientPortal}</span>
          </SidebarMenuButton>
        </form>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
