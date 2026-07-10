export {
  PortalApplicationShell,
  type PortalApplicationShellProps,
  type PortalNavVariant,
} from "./portal-application-shell";

export {
  PortalShellHeader,
  PortalShellHeaderProvider,
  usePortalShellHeader,
} from "./portal-shell-header-context";

export { PortalShellSidebarFooter } from "./portal-shell-sidebar-footer";
export { ApplicationShell05SidebarSkeleton } from "./application-shell-sidebar-skeleton";
export { PortalWorkspacePage } from "./portal-workspace-page";
export { PortalWorkspacePageSkeleton } from "./portal-workspace-page-skeleton";
export { OperatorPreviewClientNavAction } from "./operator-preview-client-nav-action";

export {
  toShellBreadcrumbs,
  portalMemberToShellUser,
  buildOrgAdminSidebarConfig,
  buildOrgUserSidebarConfig,
  buildDeveloperSidebarConfig,
  buildPortalShellFooterConfig,
  type DashboardTeam,
} from "./application-shell-05-adapters";

export { FooterIdentityMark } from "./portal-shell-footer";
