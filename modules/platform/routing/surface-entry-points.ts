/**
 * Entry files per product surface for static reliance scanning (RG-S2).
 * Every `SURFACE_RELIANCE` surfaceId must have an entry here.
 */
import { DOMAIN_MODULE_DEFINITIONS } from "@/modules/platform/governance/portal-reliance-registry";
export const SURFACE_ENTRY_POINTS: Readonly<
  Record<
    string,
    {
      readonly files: readonly string[];
      /** Neon Auth pathname literals expected in join/auth state sources. */
      readonly authPathnames?: readonly string[];
      /** Skip action/domain import scan — validate auth pathnames only. */
      readonly authPageOnly?: boolean;
    }
  >
> = {
  "client-join": {
    files: [
      "app/join/page.tsx",
      "features/auth/studio-invitation-join-page.tsx",
      "features/auth/invitation-join-panel.tsx",
      "features/auth/invitation-join-steps.tsx",
      "features/auth/use-join-invitation-auth-view.ts",
      "lib/client-invitation-join-auth.ts",
      "features/auth/entry/client-invitation-entry.ts",
    ],
    authPathnames: ["sign-up", "email-otp", "accept-invitation"],
  },
  "auth-sign-in": {
    files: [
      "app/auth/[path]/page.tsx",
      "features/auth/entry/auth-view-entry.tsx",
      "features/auth/studio-auth-login-page.tsx",
      "features/auth/studio-auth-shell.tsx",
      "features/auth/auth-page-trust.ts",
    ],
    authPathnames: ["sign-in"],
    authPageOnly: true,
  },
  "auth-sign-up": {
    files: [
      "app/auth/[path]/page.tsx",
      "features/auth/entry/auth-view-entry.tsx",
      "features/auth/studio-auth-login-page.tsx",
      "features/auth/auth-page-trust.ts",
    ],
    authPathnames: ["sign-up"],
    authPageOnly: true,
  },
  "auth-email-otp": {
    files: [
      "app/auth/[path]/page.tsx",
      "features/auth/entry/auth-view-entry.tsx",
      "features/auth/studio-auth-login-page.tsx",
      "features/auth/auth-page-trust.ts",
    ],
    authPathnames: ["email-otp"],
    authPageOnly: true,
  },
  "auth-forgot-password": {
    files: [
      "app/auth/[path]/page.tsx",
      "features/auth/entry/auth-view-entry.tsx",
      "features/auth/studio-auth-login-page.tsx",
      "features/auth/auth-page-trust.ts",
    ],
    authPathnames: ["forgot-password"],
    authPageOnly: true,
  },
  "auth-reset-password": {
    files: [
      "app/auth/[path]/page.tsx",
      "features/auth/entry/auth-view-entry.tsx",
      "features/auth/studio-auth-login-page.tsx",
      "features/auth/auth-page-trust.ts",
    ],
    authPathnames: ["reset-password"],
    authPageOnly: true,
  },
  "auth-accept-invitation": {
    files: [
      "app/auth/[path]/page.tsx",
      "features/auth/entry/auth-view-entry.tsx",
      "features/auth/studio-auth-login-page.tsx",
      "features/auth/entry/client-invitation-entry.ts",
    ],
    authPathnames: ["accept-invitation"],
  },
  "org-login": {
    files: ["features/auth/entry/org-sign-in-entry.ts", "modules/platform/routing/portal-routes.ts"],
    authPathnames: ["sign-in"],
    authPageOnly: true,
  },
  "client-login": {
    files: [
      "app/client/(gate)/login/page.tsx",
      "features/auth/entry/client-sign-in-entry.ts",
      "modules/platform/routing/portal-routes.ts",
    ],
    authPathnames: ["sign-in"],
    authPageOnly: true,
  },
  "client-home-redirect": {
    files: [
      "app/page.tsx",
      "features/auth/entry/client-home-entry.tsx",
      "features/landing/lynx-landing-page.tsx",
      "features/landing/vanguard-landing.tsx",
      "features/landing/ritual-engine.ts",
      "features/landing/lynx-landing.css",
      "public/lynx/lynx-laptop.png",
      "public/lynx/lynx-laptop.webp",
      "public/lynx/lynx-auth-popup.png",
      "features/auth/entry/client-sign-in-entry.ts",
      "features/auth/entry/client-invitation-entry.ts",
      "modules/platform/routing/portal-routes.ts",
    ],
  },
  "client-preview-unavailable": {
    files: [
      "app/client/(gate)/preview-unavailable/page.tsx",
      "lib/pages/client-preview-unavailable-page.tsx",
      "lib/preview-client.ts",
    ],
  },
  "client-onboarding": {
    files: [
      "app/client/(workspace)/onboarding/page.tsx",
      "lib/pages/client-onboarding-page.tsx",
      "lib/pages/client-workspace-unavailable.tsx",
    ],
  },
  "client-profile": {
    files: [
      "app/client/(workspace)/profile/page.tsx",
      "lib/pages/client-profile-page.tsx",
      "lib/pages/client-workspace-unavailable.tsx",
    ],
  },
  "client-dashboard": {
    files: [
      "app/client/(workspace)/page.tsx",
      "lib/pages/client-dashboard-page.tsx",
      "lib/pages/client-workspace-unavailable.tsx",
    ],
  },
  "client-acknowledgement": {
    files: [
      "lib/pages/client-dashboard-page.tsx",
      "lib/pages/client-workspace-unavailable.tsx",
    ],
  },
  "client-declare": {
    files: [
      "app/client/(workspace)/declare/[id]/page.tsx",
      "lib/pages/client-declare-page.tsx",
      "lib/pages/client-workspace-unavailable.tsx",
    ],
  },
  "admin-dashboard": {
    files: [
      "app/dashboard/page.tsx",
      "app/dashboard/loading.tsx",
      "features/organization-admin/organization-admin-dashboard-page.ts",
      "features/organization-admin/organization-admin-dashboard-types.ts",
      "components-V2/platform-views/portal-views/organization-admin-declarations-dashboard.tsx",
      "components-V2/platform-views/portal-views/portal-declarations-datatable.tsx",
      "components-V2/platform-views/portal-views/portal-organization-admin-statistics-card.tsx",
      "components-V2/platform-views/portal-views/portal-declarations-table.tsx",
    ],
  },
  "admin-declaration-detail": {
    files: [
      "app/dashboard/[id]/page.tsx",
      "app/dashboard/[id]/loading.tsx",
      "features/organization-admin/organization-admin-declaration-detail.tsx",
      "features/organization-admin/organization-admin-declaration-detail.logic.ts",
      "components-V2/platform-views/portal-views/organization-admin-declaration-detail.tsx",
      "components-V2/platform-views/portal-views/portal-declaration-submissions-table.tsx",
      "components-V2/platform-views/portal-views/portal-access-share-panel.tsx",
      "components/declaration-manage-form.tsx",
      "components/declaration-share-panel.tsx",
      "components/declaration-danger-zone.tsx",
      "components/declaration-delete-button.tsx",
      "components/secure-link-rotate-button.tsx",
      "components/submission-answers.tsx",
    ],
  },
  "admin-clients": {
    files: [
      "app/dashboard/clients/page.tsx",
      "app/dashboard/clients/loading.tsx",
      "features/organization-admin/organization-admin-clients-page.ts",
      "features/organization-admin/organization-admin-clients-types.ts",
      "modules/identity/email/client-email-delivery.ts",
      "modules/identity/email/send-client-onboarding-email.ts",
      "components-V2/platform-views/portal-views/organization-admin-clients-list.tsx",
      "components-V2/platform-views/portal-views/portal-client-tables.tsx",
      "components-V2/platform-views/portal-views/portal-client-delete-buttons.tsx",
      "components-V2/platform-views/portal-views/portal-invite-client-link.tsx",
      "components/issue-client-invite-form.tsx",
    ],
  },
  "admin-issue-invite": {
    files: [
      "components/issue-client-invite-form.tsx",
      "modules/identity/email/send-client-onboarding-email.ts",
    ],
  },
  "admin-create-declaration": {
    files: [
      "components-V2/platform-views/portal-views/portal-create-declaration-button.tsx",
      "components/declaration-create-button.tsx",
    ],
  },
  "admin-access-share": {
    files: [
      "components/declaration-share-panel.tsx",
      "components/secure-link-rotate-button.tsx",
      "components-V2/platform-views/portal-views/portal-access-share-panel.tsx",
      "lib/domain/declaration-share-links.ts",
    ],
  },
  "public-survey-link": {
    files: [
      "app/survey/[slug]/page.tsx",
      "features/auth/entry/open-link-entry.ts",
    ],
  },
  "public-secure-link": {
    files: [
      "app/f/[token]/page.tsx",
      "features/auth/entry/secure-link-entry.ts",
    ],
  },
  "shell-dashboard": {
    files: [
      "app/dashboard/layout.tsx",
      "components-V2/platform-components/AdminCnShell.tsx",
      "components-V2/platform-components/layout/PagesLayout.tsx",
      "components-V2/platform-config/navConfig.tsx",
      "components-V2/platform-config/themeConfig.ts",
    ],
  },
  "client-preview-banner": {
    files: [
      "app/client/(workspace)/layout.tsx",
      "components/portal/portal-preview-banner.tsx",
    ],
  },
};

/** Exported server actions that are internal/legacy and not bound to a UI surface. */
export const INTERNAL_ACTION_ALLOWLIST: ReadonlyArray<{
  actionId: string;
  reason: string;
}> = [
  {
    actionId: "action:adminSignInAction",
    reason: "Legacy operator sign-in — superseded by Neon Auth UI at /auth/sign-in?from=org",
  },
  {
    actionId: "action:validateSurveyPackageAction",
    reason: "Package analysis helper — import flow uses importSurveyPackageAction directly",
  },
];

/** Maps auth pathname literals to Neon Auth operation ids. */
export const AUTH_PATHNAME_TO_OPERATION: Readonly<Record<string, string>> = {
  "sign-in": "auth:sign-in/email",
  "sign-up": "auth:sign-up/email",
  "email-otp": "auth:email-otp",
  "forgot-password": "auth:forget-password",
  "reset-password": "auth:reset-password",
  "accept-invitation": "auth:organization/accept-invitation",
};

/** Maps @/lib import paths to domain module ids. */
export const LIB_IMPORT_DOMAIN_MAP: ReadonlyArray<{
  prefix: string;
  domainId: string;
}> = [
  { prefix: "@/modules/declarations/domain/surveys", domainId: "domain:surveys" },
  { prefix: "@/modules/declarations/domain/questions", domainId: "domain:questions" },
  { prefix: "@/modules/declarations/domain/clients", domainId: "domain:clients" },
  { prefix: "@/modules/identity/portal-member", domainId: "domain:clients" },
  { prefix: "@/modules/declarations/domain/client-declaration-draft", domainId: "domain:clients" },
  { prefix: "@/modules/platform/api/client-declaration-draft-route", domainId: "domain:clients" },
  { prefix: "@/modules/platform/audit", domainId: "domain:audit" },
  { prefix: "@/modules/identity/auth/session", domainId: "domain:auth" },
  { prefix: "@/modules/identity/auth/get-session", domainId: "domain:auth" },
  { prefix: "@/modules/identity/auth/server", domainId: "domain:auth" },
  { prefix: "@/modules/identity/auth/admin", domainId: "domain:auth" },
  { prefix: "@/modules/identity/auth/env", domainId: "domain:auth" },
  { prefix: "@/modules/identity/auth/neon-auth-request", domainId: "domain:auth" },
  { prefix: "@/modules/identity/auth/bootstrap-client-invite", domainId: "domain:auth" },
  { prefix: "@/modules/identity/auth/auth-entry-params", domainId: "domain:auth" },
  { prefix: "@/features/auth/auth-page-trust", domainId: "domain:auth" },
  { prefix: "@/modules/identity/account-session", domainId: "domain:auth" },
  { prefix: "@/modules/identity/email/", domainId: "domain:email" },
  { prefix: "@/modules/declarations/domain/survey-package", domainId: "domain:survey-package" },
  { prefix: "@/modules/declarations/client-onboarding.server", domainId: "domain:client-onboarding" },
  { prefix: "@/features/auth/entry/client-invitation-entry", domainId: "domain:client-invitation-entry" },
  { prefix: "@/features/auth/entry/open-link-entry", domainId: "domain:open-link-entry" },
  { prefix: "@/features/auth/entry/secure-link-entry", domainId: "domain:secure-link-entry" },
  { prefix: "@/features/organization-admin/organization-admin-dashboard-page", domainId: "domain:operator-dashboard-page" },
  { prefix: "@/features/organization-admin/organization-admin-clients-page", domainId: "domain:operator-clients-page" },
  { prefix: "@/features/organization-admin/organization-admin-declaration-detail", domainId: "domain:operator-declaration-detail" },
  { prefix: "@/features/organization-admin/organization-admin-declaration-detail.logic", domainId: "domain:questions" },
  { prefix: "@/modules/declarations/domain/declaration-share-links", domainId: "domain:surveys" },
  { prefix: "@/modules/identity/preview-client", domainId: "domain:preview-client" },
  { prefix: "@/modules/identity/organization-admin-shell-members", domainId: "domain:preview-client" },
  { prefix: "@/modules/platform/routing/portal-session-routing", domainId: "domain:auth" },
  { prefix: "@/features/auth/entry/client-sign-in-entry", domainId: "domain:auth" },
  { prefix: "@/lib/pages/client-declare-page.logic", domainId: "domain:clients" },
  { prefix: "@/modules/declarations/domain/survey-submission", domainId: "domain:surveys" },
  { prefix: "@/modules/identity/delete-client-auth-user", domainId: "domain:auth" },
];

/** Neon Auth ops invoked server-side from actions (not visible as UI imports). */
export const SERVER_SIDE_AUTH_BY_SURFACE: Readonly<Record<string, readonly string[]>> = {
  "admin-issue-invite": ["auth:organization/invite-member"],
};

/** Surfaces that redirect into Neon Auth without embedding pathname literals in scanned sources. */
export const AUTH_REDIRECT_ENTRY_SURFACES = new Set([
  "client-home-redirect",
]);

/** Admin route surfaces inherit operator session enforcement from dashboard layout. */
export const LAYOUT_PROTECTED_ADMIN_SURFACES = new Set([
  "admin-dashboard",
  "admin-clients",
  "admin-declaration-detail",
  "admin-create-declaration",
  "admin-issue-invite",
  "admin-access-share",
]);

/** Session helpers resolved outside app/actions but tracked as action nodes. */
export const SESSION_HELPER_ACTIONS: Readonly<Record<string, string>> = {
  requireClientSession: "action:requireClientSession",
  requireAdminSession: "action:requireAdminSession",
  requireAccountSession: "action:requireAccountSession",
};

export function domainLoaderSatisfiedByEntryFile(
  domainId: string,
  entryFiles: readonly string[],
): boolean {
  const definition = DOMAIN_MODULE_DEFINITIONS.find((entry) => entry.id === domainId);
  if (!definition) {
    return false;
  }

  return entryFiles.some(
    (file) => file === definition.path || file.endsWith(`/${definition.path}`),
  );
}
