"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { ReactElement } from "react";
import { ChevronRightIcon } from "lucide-react";

import { applicationShell05AnchorLink } from "./shell-render-link";
import type {
  ApplicationShell05LinkRenderProps,
  ApplicationShell05NavGroup,
  ApplicationShell05NavItem,
  ApplicationShell05SidebarConfig,
} from "./types";

function isNavBranch(item: ApplicationShell05NavItem): item is Extract<ApplicationShell05NavItem, { items: unknown }> {
  return "items" in item;
}

function avatarFallback(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

function NavGroupSection({
  group,
  renderLink,
}: {
  group: ApplicationShell05NavGroup;
  renderLink: (props: ApplicationShell05LinkRenderProps) => ReactElement;
}) {
  if (group.variant === "avatar") {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((recipient) => (
              <SidebarMenuItem key={recipient.id}>
                <SidebarMenuButton
                  isActive={recipient.isActive}
                  render={renderLink({ href: recipient.href })}
                >
                  <Avatar className="size-6 transition-[width,height] duration-200 [[data-state=collapsed]_&]:size-4">
                    <AvatarImage src={recipient.avatarSrc} alt={recipient.name} />
                    <AvatarFallback>{avatarFallback(recipient.name)}</AvatarFallback>
                  </Avatar>
                  <span>{recipient.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) =>
            isNavBranch(item) ? (
              <Collapsible className="group/collapsible" key={item.id}>
                <SidebarMenuItem>
                  <CollapsibleTrigger render={<SidebarMenuButton isActive={item.isActive} />}>
                    {item.icon}
                    <span>{item.label}</span>
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.id}>
                          <SidebarMenuSubButton
                            isActive={subItem.isActive}
                            className="justify-between"
                            render={renderLink({ href: subItem.href })}
                          >
                            {subItem.label}
                            {subItem.badge ? (
                              <span className="bg-primary/10 flex h-5 min-w-5 items-center justify-center rounded-full text-xs">
                                {subItem.badge}
                              </span>
                            ) : null}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={item.isActive}
                  render={renderLink({ href: item.href })}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
                {item.badge ? (
                  <SidebarMenuBadge className="bg-primary/10 top-1/2! right-2 -translate-y-1/2! rounded-full">
                    {item.badge}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function ApplicationShell05Sidebar({
  brand,
  navGroups,
  sidebarHeader,
  navActions,
  footer,
  renderLink = applicationShell05AnchorLink,
  className,
  ...sidebarProps
}: ApplicationShell05SidebarConfig & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className={cn(
        "p-6 pr-0 *:data-[slot=sidebar-inner]:group-data-[variant=floating]:rounded-xl",
        className,
      )}
      {...sidebarProps}
    >
      <SidebarHeader>
        {sidebarHeader ?? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="gap-2.5 bg-transparent! [&>svg]:size-8"
                render={renderLink({ href: brand.href })}
              >
                {brand.logo}
                <span className="text-xl font-semibold">{brand.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroupSection key={group.id} group={group} renderLink={renderLink} />
        ))}
        {navActions}
      </SidebarContent>
      {footer ? <SidebarFooter>{footer}</SidebarFooter> : null}
    </Sidebar>
  );
}
