/**
 * Entry files per product surface for static reliance scanning (RG-S2).
 * Every `SURFACE_RELIANCE` surfaceId must have an entry here.
 */
import { DOMAIN_MODULE_DEFINITIONS } from "@/lib/governance/portal-reliance-registry";
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
      "lib/entry/client-invitation-entry.ts",
      "components/portal/portal-invitation-join-page.tsx",
      "components/guardian-invitation-join-page.tsx",
      "components/portal/portal-invitation-join-panel.tsx",
      "components/use-join-invitation-auth-view.ts",
      "lib/client-invitation-join-auth.ts",
    ],
    authPathnames: ["sign-up", "email-otp", "accept-invitation"],
  },
  "auth-sign-in": {
    files: ["app/auth/[path]/page.tsx", "lib/auth/auth-page-trust.ts"],
    authPathnames: ["sign-in"],
    authPageOnly: true,
  },
  "auth-sign-up": {
    files: ["app/auth/[path]/page.tsx", "lib/auth/auth-page-trust.ts"],
    authPathnames: ["sign-up"],
    authPageOnly: true,
  },
  "auth-email-otp": {
    files: ["app/auth/[path]/page.tsx", "lib/auth/auth-page-trust.ts"],
    authPathnames: ["email-otp"],
    authPageOnly: true,
  },
  "auth-forgot-password": {
    files: ["app/auth/[path]/page.tsx", "lib/auth/auth-page-trust.ts"],
    authPathnames: ["forgot-password"],
    authPageOnly: true,
  },
  "auth-reset-password": {
    files: ["app/auth/[path]/page.tsx", "lib/auth/auth-page-trust.ts"],
    authPathnames: ["reset-password"],
    authPageOnly: true,
  },
  "auth-accept-invitation": {
    files: ["app/auth/[path]/page.tsx", "lib/entry/client-invitation-entry.ts"],
    authPathnames: ["accept-invitation"],
  },
  "org-login": {
    files: ["lib/entry/org-sign-in-entry.ts", "lib/routing/portal-routes.ts"],
    authPathnames: ["sign-in"],
    authPageOnly: true,
  },
  "client-login": {
    files: [
      "app/client/(gate)/login/page.tsx",
      "lib/entry/client-sign-in-entry.ts",
      "lib/routing/portal-routes.ts",
    ],
    authPathnames: ["sign-in"],
    authPageOnly: true,
  },
  "client-home-redirect": {
    files: [
      "app/page.tsx",
      "lib/entry/client-sign-in-entry.ts",
      "lib/entry/client-invitation-entry.ts",
      "lib/routing/portal-routes.ts",
    ],
  },
  "client-preview-unavailable": {
    files: [
      "app/client/(gate)/preview-unavailable/page.tsx",
      "lib/pages/client-preview-unavailable-page.tsx",
      "components/client/client-preview-unavailable-view.tsx",
      "lib/preview-client.ts",
    ],
  },
  "client-onboarding": {
    files: [
      "app/client/(workspace)/onboarding/page.tsx",
      "lib/pages/client-onboarding-page.tsx",
      "components/client/client-onboarding-wizard.tsx",
      "components/client/client-onboarding-form.tsx",
      "lib/client-onboarding.server.ts",
      "lib/server-actions/form-data.ts",
    ],
  },
  "client-profile": {
    files: [
      "app/client/(workspace)/profile/page.tsx",
      "lib/pages/client-profile-page.tsx",
      "components/client/client-declarant-profile-view.tsx",
    ],
  },
  "client-dashboard": {
    files: [
      "app/client/(workspace)/page.tsx",
      "lib/pages/client-dashboard-page.tsx",
      "components/client/client-dashboard-acknowledgement.tsx",
      "components/client/client-dashboard-assignments.tsx",
      "components/client/client-dashboard-summary.tsx",
    ],
  },
  "client-acknowledgement": {
    files: ["components/client/client-dashboard-acknowledgement.tsx"],
  },
  "client-declare": {
    files: [
      "app/client/(workspace)/declare/[id]/page.tsx",
      "lib/pages/client-declare-page.tsx",
      "lib/pages/client-declare-page.logic.ts",
      "components/client/client-declare-workspace.tsx",
      "components/client/client-declaration-form.tsx",
      "components/declaration-form.tsx",
      "app/api/client/declaration-draft/route.ts",
      "lib/api/client-declaration-draft-route.ts",
      "lib/api/client-declaration-draft-route.logic.ts",
      "lib/server-actions/register-evidence-form.ts",
    ],
  },
  "admin-dashboard": {
    files: [
      "app/dashboard/page.tsx",
      "app/dashboard/loading.tsx",
      "lib/pages/operator-dashboard-page.ts",
      "lib/pages/operator-dashboard-types.ts",
      "components/operator/operator-dashboard-page-view.tsx",
      "components/operator/org-declarations-table.tsx",
    ],
  },
  "admin-declaration-detail": {
    files: [
      "app/dashboard/[id]/page.tsx",
      "app/dashboard/[id]/loading.tsx",
      "lib/pages/operator-declaration-detail.tsx",
      "lib/pages/operator-declaration-detail.logic.ts",
      "components/operator/operator-declaration-detail-view.tsx",
      "components/declaration-manage-form.tsx",
      "components/declaration-share-panel.tsx",
      "components/client/client-access-share-panel.tsx",
      "components/operator/org-declaration-submissions-table.tsx",
    ],
  },
  "admin-clients": {
    files: [
      "app/dashboard/clients/page.tsx",
      "app/dashboard/clients/loading.tsx",
      "lib/pages/operator-clients-page.ts",
      "lib/pages/operator-clients-types.ts",
      "lib/email/client-email-delivery.ts",
      "lib/email/send-client-onboarding-email.ts",
      "components/operator/operator-clients-page-view.tsx",
      "components/client/client-email-delivery-banner.tsx",
      "components/operator/org-client-tables.tsx",
      "components/issue-client-invite-form.tsx",
    ],
  },
  "admin-issue-invite": {
    files: [
      "components/issue-client-invite-form.tsx",
      "lib/email/send-client-onboarding-email.ts",
    ],
  },
  "admin-create-declaration": {
    files: [
      "components/declaration-create-button.tsx",
      "components/operator/org-create-declaration-link.tsx",
    ],
  },
  "admin-access-share": {
    files: [
      "components/declaration-share-panel.tsx",
      "components/secure-link-rotate-button.tsx",
      "lib/domain/declaration-share-links.ts",
    ],
  },
  "public-survey-link": {
    files: [
      "app/survey/[slug]/page.tsx",
      "lib/entry/open-link-entry.ts",
    ],
  },
  "public-secure-link": {
    files: [
      "app/f/[token]/page.tsx",
      "lib/entry/secure-link-entry.ts",
    ],
  },
  "shell-dashboard": {
    files: [
      "app/dashboard/layout.tsx",
      "lib/operator-shell-members.ts",
      "components/portal/portal-application-shell/index.ts",
      "components/portal/portal-application-shell/application-shell-05-adapters.tsx",
      "components/portal/portal-application-shell/portal-shell-footer.tsx",
      "components/V2/application-shell-5/application-shell-05-footer.tsx",
      "components/V2/application-shell-5/application-shell-05-breadcrumb.tsx",
      "components/team-switcher.tsx",
    ],
  },
  "client-preview-banner": {
    files: [
      "app/client/(workspace)/layout.tsx",
      "lib/client-workspace-layout.tsx",
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
  { prefix: "@/lib/domain/surveys", domainId: "domain:surveys" },
  { prefix: "@/lib/domain/questions", domainId: "domain:questions" },
  { prefix: "@/lib/domain/clients", domainId: "domain:clients" },
  { prefix: "@/lib/portal-member", domainId: "domain:clients" },
  { prefix: "@/lib/domain/client-declaration-draft", domainId: "domain:clients" },
  { prefix: "@/lib/api/client-declaration-draft-route", domainId: "domain:clients" },
  { prefix: "@/lib/domain/audit", domainId: "domain:audit" },
  { prefix: "@/lib/auth/session", domainId: "domain:auth" },
  { prefix: "@/lib/auth/get-session", domainId: "domain:auth" },
  { prefix: "@/lib/auth/server", domainId: "domain:auth" },
  { prefix: "@/lib/auth/admin", domainId: "domain:auth" },
  { prefix: "@/lib/auth/env", domainId: "domain:auth" },
  { prefix: "@/lib/auth/neon-auth-request", domainId: "domain:auth" },
  { prefix: "@/lib/auth/bootstrap-client-invite", domainId: "domain:auth" },
  { prefix: "@/lib/auth/auth-entry-params", domainId: "domain:auth" },
  { prefix: "@/lib/auth/auth-page-trust", domainId: "domain:auth" },
  { prefix: "@/lib/account-session", domainId: "domain:auth" },
  { prefix: "@/lib/email/", domainId: "domain:email" },
  { prefix: "@/lib/domain/survey-package", domainId: "domain:survey-package" },
  { prefix: "@/lib/client-onboarding.server", domainId: "domain:client-onboarding" },
  { prefix: "@/lib/entry/client-invitation-entry", domainId: "domain:client-invitation-entry" },
  { prefix: "@/lib/entry/open-link-entry", domainId: "domain:open-link-entry" },
  { prefix: "@/lib/entry/secure-link-entry", domainId: "domain:secure-link-entry" },
  { prefix: "@/lib/pages/operator-dashboard-page", domainId: "domain:operator-dashboard-page" },
  { prefix: "@/lib/pages/operator-clients-page", domainId: "domain:operator-clients-page" },
  { prefix: "@/lib/pages/operator-declaration-detail", domainId: "domain:operator-declaration-detail" },
  { prefix: "@/lib/pages/operator-declaration-detail.logic", domainId: "domain:questions" },
  { prefix: "@/lib/domain/declaration-share-links", domainId: "domain:surveys" },
  { prefix: "@/lib/preview-client", domainId: "domain:preview-client" },
  { prefix: "@/lib/operator-shell-members", domainId: "domain:preview-client" },
  { prefix: "@/lib/routing/portal-session-routing", domainId: "domain:auth" },
  { prefix: "@/lib/entry/client-sign-in-entry", domainId: "domain:auth" },
  { prefix: "@/lib/pages/client-dashboard-page", domainId: "domain:clients" },
  { prefix: "@/lib/pages/client-onboarding-page", domainId: "domain:client-onboarding" },
  { prefix: "@/lib/pages/client-profile-page", domainId: "domain:clients" },
  { prefix: "@/lib/pages/client-declare-page", domainId: "domain:clients" },
  { prefix: "@/lib/pages/client-declare-page.logic", domainId: "domain:clients" },
  { prefix: "@/lib/client-workspace-layout", domainId: "domain:preview-client" },
  { prefix: "@/lib/domain/survey-submission", domainId: "domain:surveys" },
  { prefix: "@/lib/delete-client-auth-user", domainId: "domain:auth" },
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
