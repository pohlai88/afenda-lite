"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";

import ActivityDialog from "@/components/shadcn-studio/shared/dialog-activity";
import LanguageDropdown from "@/components/shadcn-studio/shared/dropdown-language";
import NotificationDropdown from "@/components/shadcn-studio/shared/dropdown-notification";
import ProfileDropdown from "@/components/shadcn-studio/shared/dropdown-profile";
import SearchDialog from "@/components/shadcn-studio/shared/dialog-search";
import MenuTrigger from "@/components/shadcn-studio/shared/menu-trigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  ActivityIcon,
  BellIcon,
  LanguagesIcon,
  SearchIcon,
} from "lucide-react";

import { ApplicationShell05Footer } from "./application-shell-05-footer";
import { applicationShell05AnchorLink } from "./shell-render-link";
import type {
  ApplicationShell05FooterConfig,
  ApplicationShell05Header,
  ApplicationShell05LinkRenderProps,
  ApplicationShell05User,
} from "./types";
import { applicationShell05Greeting } from "./types";

const sidebarProviderStyle = {
  "--sidebar-width": "17.5rem",
  "--sidebar-width-icon": "3.375rem",
} as CSSProperties;

function avatarFallback(user: ApplicationShell05User) {
  return (
    user.avatarFallback ??
    user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
  );
}

export type ApplicationShell05LayoutProps = {
  children?: ReactNode;
  sidebar: ReactNode;
  header?: ApplicationShell05Header;
  footer?: ApplicationShell05FooterConfig;
  profileUser?: ApplicationShell05User;
  sidebarStyle?: CSSProperties;
  renderLink?: (props: ApplicationShell05LinkRenderProps) => ReactElement;
  /** Studio demo search/notification chrome — off in production. */
  showStudioChrome?: boolean;
};

export function ApplicationShell05Layout({
  children,
  sidebar,
  header,
  footer,
  profileUser,
  sidebarStyle,
  renderLink,
  showStudioChrome = false,
}: ApplicationShell05LayoutProps) {
  const greeting =
    header?.greeting ?? (profileUser ? applicationShell05Greeting(profileUser) : undefined);
  const profileFallback = profileUser ? avatarFallback(profileUser) : "?";
  const resolvedRenderLink = renderLink ?? applicationShell05AnchorLink;

  return (
    <div className="application-shell-05 font-sans relative min-h-dvh w-full">
      <SidebarProvider style={{ ...sidebarProviderStyle, ...sidebarStyle }}>
        {sidebar}
        <div className="z-1 flex flex-1 flex-col py-6">
          <header className="text-primary-foreground" data-slot="app-shell-hero">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
              <div className="flex items-center gap-4">
                <MenuTrigger
                  variant="outline"
                  className="bg-primary-foreground! border-primary-foreground! text-primary! shadow-none"
                />
                {greeting ? (
                  <div className="hidden flex-col items-start gap-1 sm:flex" data-app-header>
                    <p className="text-lg font-semibold" data-app-greeting>
                      {greeting}
                    </p>
                  </div>
                ) : null}
              </div>
              {showStudioChrome ? (
                <SearchDialog
                  className="hidden w-full max-w-72 xl:block"
                  trigger={
                    <Button className="bg-secondary/20 text-muted hover:bg-secondary/20 aria-expanded:bg-secondary aria-expanded:text-muted w-full justify-start font-normal active:not-aria-[haspopup]:translate-y-0">
                      <SearchIcon className="size-4" />
                      <span>Type to search...</span>
                    </Button>
                  }
                />
              ) : null}
              {showStudioChrome ? (
                <div className="flex items-center gap-1.5" data-icon-cluster>
                  <SearchDialog
                    className="block xl:hidden"
                    trigger={
                      <Button variant="ghost" size="icon-lg">
                        <SearchIcon />
                        <span className="sr-only">Search</span>
                      </Button>
                    }
                  />
                  <LanguageDropdown
                    trigger={
                      <Button variant="ghost" size="icon-lg">
                        <LanguagesIcon />
                      </Button>
                    }
                  />
                  <ActivityDialog
                    trigger={
                      <Button variant="ghost" size="icon-lg">
                        <ActivityIcon />
                      </Button>
                    }
                  />
                  <NotificationDropdown
                    trigger={
                      <Button variant="ghost" size="icon-lg" className="relative">
                        <BellIcon />
                        <span className="bg-destructive absolute top-[14%] right-[23%] size-2 rounded-full" />
                      </Button>
                    }
                  />
                  <ProfileDropdown
                    user={profileUser}
                    trigger={
                      <Button variant="ghost" size="icon-lg">
                        <Avatar className="size-[inherit] rounded-[inherit] after:rounded-[inherit]">
                          {profileUser?.avatarSrc ? (
                            <AvatarImage
                              src={profileUser.avatarSrc}
                              className="rounded-[inherit]"
                            />
                          ) : null}
                          <AvatarFallback className="rounded-[inherit]">{profileFallback}</AvatarFallback>
                        </Avatar>
                      </Button>
                    }
                  />
                </div>
              ) : null}
            </div>
          </header>
          <main className="mx-auto size-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
          {footer ? (
            <ApplicationShell05Footer {...footer} renderLink={resolvedRenderLink} />
          ) : null}
        </div>
      </SidebarProvider>
    </div>
  );
}
