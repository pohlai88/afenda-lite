"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { startClientPreviewAction } from "@/app/actions/admin";
import {
  type DashboardNavGroup,
  isNavGroupActive,
  isNavItemActive,
} from "@/lib/dashboard-nav";
import { ChevronRightIcon } from "lucide-react";

export function NavMain({ groups }: { groups: DashboardNavGroup[] }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function openClientPreview() {
    startTransition(async () => {
      await startClientPreviewAction();
    });
  }

  return (
    <>
      {groups.map((group) => {
        const groupActive = isNavGroupActive(pathname, group);

        return (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible
                defaultOpen={groupActive}
                className="group/collapsible"
                render={<SidebarMenuItem />}
              >
                <CollapsibleTrigger
                  render={<SidebarMenuButton tooltip={group.title} />}
                >
                  {group.icon}
                  <span>{group.title}</span>
                  <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {group.items.map((item) => (
                      <SidebarMenuSubItem key={item.url}>
                        {item.usePreviewAction ? (
                          <SidebarMenuSubButton
                            isActive={isNavItemActive(pathname, item.url)}
                            onClick={openClientPreview}
                            className={isPending ? "pointer-events-none opacity-50" : undefined}
                          >
                            <span>{item.title}</span>
                          </SidebarMenuSubButton>
                        ) : (
                          <SidebarMenuSubButton
                            isActive={isNavItemActive(pathname, item.url)}
                            render={<Link href={item.url} />}
                          >
                            <span>{item.title}</span>
                          </SidebarMenuSubButton>
                        )}
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        );
      })}
    </>
  );
}
