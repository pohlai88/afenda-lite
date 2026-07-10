"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRightIcon,
  CreditCardIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import type { ApplicationShell05User } from "./types";

type SidebarUserDropdownProps = {
  user: ApplicationShell05User;
};

function avatarFallback(user: ApplicationShell05User) {
  return (
    user.avatarFallback ??
    user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
  );
}

function UserIdentity({ user, nameClassName }: { user: ApplicationShell05User; nameClassName?: string }) {
  const fallback = avatarFallback(user);

  return (
    <>
      <Avatar className="rounded-lg after:rounded-[inherit]">
        {user.avatarSrc ? (
          <AvatarImage src={user.avatarSrc} alt={user.name} className="rounded-[inherit]" />
        ) : null}
        <AvatarFallback className="rounded-[inherit]">{fallback}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className={`truncate font-medium ${nameClassName ?? ""}`}>{user.name}</span>
        {user.role ? <span className="text-muted-foreground truncate text-xs">{user.role}</span> : null}
      </div>
    </>
  );
}

export function SidebarUserDropdown({ user }: SidebarUserDropdownProps) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <UserIdentity user={user} />
            <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 max-lg:rotate-270 [[data-popup-open]>&]:rotate-90 lg:[[data-popup-open]>&]:-rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={isMobile ? 8 : 16}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserIdentity user={user} nameClassName="text-popover-foreground" />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserIcon />
                My Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UsersIcon />
                Manage Team
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default SidebarUserDropdown;
