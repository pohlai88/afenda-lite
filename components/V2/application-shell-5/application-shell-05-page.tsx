"use client";

import type { ReactNode } from "react";

import { ApplicationShell05Layout } from "./application-shell-05-layout";
import { ApplicationShell05Sidebar } from "./application-shell-05-sidebar";
import SidebarUserDropdown from "./sidebar-user-dropdown";

import type { ApplicationShell05SidebarConfig } from "./types";
import type { ApplicationShell05LayoutProps } from "./application-shell-05-layout";

export type ApplicationShell05PageProps = {
  children?: ReactNode;
  sidebarConfig: ApplicationShell05SidebarConfig;
  header?: ApplicationShell05LayoutProps["header"];
  footer?: ApplicationShell05LayoutProps["footer"];
  profileUser?: ApplicationShell05LayoutProps["profileUser"];
  sidebarStyle?: ApplicationShell05LayoutProps["sidebarStyle"];
  renderLink?: ApplicationShell05LayoutProps["renderLink"];
  showStudioChrome?: ApplicationShell05LayoutProps["showStudioChrome"];
};

export function ApplicationShell05Page({
  children,
  sidebarConfig,
  header,
  footer,
  profileUser,
  sidebarStyle,
  renderLink,
  showStudioChrome = false,
}: ApplicationShell05PageProps) {
  const resolvedRenderLink = renderLink ?? sidebarConfig.renderLink;

  return (
    <ApplicationShell05Layout
      sidebar={
        <ApplicationShell05Sidebar
          brand={sidebarConfig.brand}
          navGroups={sidebarConfig.navGroups}
          sidebarHeader={sidebarConfig.sidebarHeader}
          navActions={sidebarConfig.navActions}
          footer={
            sidebarConfig.footer ??
            (profileUser ? <SidebarUserDropdown user={profileUser} /> : null)
          }
          renderLink={resolvedRenderLink}
        />
      }
      header={header}
      footer={footer}
      profileUser={profileUser}
      sidebarStyle={sidebarStyle}
      renderLink={resolvedRenderLink}
      showStudioChrome={showStudioChrome}
    >
      {children}
    </ApplicationShell05Layout>
  );
}
