/**
 * FE/BE reliance SSOT — surfaces, server actions, auth operations, domain modules, gates.
 * Materialized to docs/architecture/reliance-graph.snapshot.json via export:reliance-graph.
 *
 * Pattern borrowed from afenda-Xerp integration graph (FSI-S10): registries → snapshot → drift gate.
 */

export const PORTAL_RELIANCE_GRAPH_VERSION = "1.0.0" as const;

export type RelianceNodeType =
  | "ui-surface"
  | "server-action"
  | "auth-operation"
  | "domain-module"
  | "gate"
  | "ccp";

export type RelianceEdgeType = "consumes" | "materializes" | "validates";

export type RelianceConsumerTarget =
  | { kind: "server-action"; actionId: string }
  | { kind: "auth-operation"; operationId: string }
  | { kind: "domain-loader"; domainId: string };

/** Explicit UI surface → backend reliance (actions, Neon Auth ops, RSC domain loaders). */
export const SURFACE_RELIANCE: ReadonlyArray<{
  surfaceId: string;
  consumes: readonly RelianceConsumerTarget[];
}> = [
  {
    surfaceId: "client-join",
    consumes: [
      { kind: "auth-operation", operationId: "auth:sign-up/email" },
      { kind: "auth-operation", operationId: "auth:email-otp" },
      { kind: "auth-operation", operationId: "auth:organization/accept-invitation" },
      { kind: "domain-loader", domainId: "domain:client-invitation-entry" },
      { kind: "domain-loader", domainId: "domain:auth" },
    ],
  },
  {
    surfaceId: "auth-sign-in",
    consumes: [{ kind: "auth-operation", operationId: "auth:sign-in/email" }],
  },
  {
    surfaceId: "auth-sign-up",
    consumes: [{ kind: "auth-operation", operationId: "auth:sign-up/email" }],
  },
  {
    surfaceId: "auth-email-otp",
    consumes: [{ kind: "auth-operation", operationId: "auth:email-otp" }],
  },
  {
    surfaceId: "auth-forgot-password",
    consumes: [{ kind: "auth-operation", operationId: "auth:forget-password" }],
  },
  {
    surfaceId: "auth-reset-password",
    consumes: [{ kind: "auth-operation", operationId: "auth:reset-password" }],
  },
  {
    surfaceId: "auth-accept-invitation",
    consumes: [
      { kind: "auth-operation", operationId: "auth:organization/accept-invitation" },
      { kind: "domain-loader", domainId: "domain:client-invitation-entry" },
      { kind: "domain-loader", domainId: "domain:auth" },
    ],
  },
  {
    surfaceId: "client-login",
    consumes: [{ kind: "auth-operation", operationId: "auth:sign-in/email" }],
  },
  {
    surfaceId: "client-home-redirect",
    consumes: [
      { kind: "auth-operation", operationId: "auth:sign-in/email" },
      { kind: "domain-loader", domainId: "domain:client-invitation-entry" },
      { kind: "domain-loader", domainId: "domain:auth" },
    ],
  },
  {
    surfaceId: "client-preview-unavailable",
    consumes: [{ kind: "domain-loader", domainId: "domain:preview-client" }],
  },
  {
    surfaceId: "client-onboarding",
    consumes: [],
  },
  {
    surfaceId: "client-profile",
    consumes: [],
  },
  {
    surfaceId: "client-dashboard",
    consumes: [],
  },
  {
    surfaceId: "client-acknowledgement",
    consumes: [],
  },
  {
    surfaceId: "client-declare",
    consumes: [],
  },
  {
    surfaceId: "admin-dashboard",
    consumes: [
      { kind: "server-action", actionId: "action:createDraftSurveyAction" },
      { kind: "server-action", actionId: "action:deleteSurveyAction" },
      { kind: "domain-loader", domainId: "domain:operator-dashboard-page" },
      { kind: "domain-loader", domainId: "domain:surveys" },
      { kind: "domain-loader", domainId: "domain:clients" },
    ],
  },
  {
    surfaceId: "admin-declaration-detail",
    consumes: [
      { kind: "server-action", actionId: "action:requireAdminSession" },
      { kind: "server-action", actionId: "action:updateSurveyAction" },
      { kind: "server-action", actionId: "action:deleteSurveyAction" },
      { kind: "server-action", actionId: "action:exportSurveyPackageAction" },
      { kind: "server-action", actionId: "action:importSurveyPackageAction" },
      { kind: "server-action", actionId: "action:regenerateInviteTokenAction" },
      { kind: "domain-loader", domainId: "domain:operator-declaration-detail" },
      { kind: "domain-loader", domainId: "domain:surveys" },
      { kind: "domain-loader", domainId: "domain:questions" },
      { kind: "domain-loader", domainId: "domain:survey-package" },
      { kind: "domain-loader", domainId: "domain:auth" },
    ],
  },
  {
    surfaceId: "admin-clients",
    consumes: [
      { kind: "server-action", actionId: "action:issueClientInviteAction" },
      { kind: "server-action", actionId: "action:removeClientRegistrationAction" },
      { kind: "server-action", actionId: "action:deleteClientAssignmentAction" },
      { kind: "domain-loader", domainId: "domain:operator-clients-page" },
      { kind: "domain-loader", domainId: "domain:email" },
      { kind: "domain-loader", domainId: "domain:surveys" },
      { kind: "domain-loader", domainId: "domain:clients" },
    ],
  },
  {
    surfaceId: "admin-issue-invite",
    consumes: [
      { kind: "server-action", actionId: "action:issueClientInviteAction" },
      { kind: "server-action", actionId: "action:requireAdminSession" },
      { kind: "auth-operation", operationId: "auth:organization/invite-member" },
    ],
  },
  {
    surfaceId: "admin-create-declaration",
    consumes: [{ kind: "server-action", actionId: "action:createDraftSurveyAction" }],
  },
  {
    surfaceId: "admin-access-share",
    consumes: [
      { kind: "server-action", actionId: "action:requireAdminSession" },
      { kind: "server-action", actionId: "action:regenerateInviteTokenAction" },
      { kind: "domain-loader", domainId: "domain:surveys" },
      { kind: "domain-loader", domainId: "domain:declaration-share-links" },
      { kind: "domain-loader", domainId: "domain:auth" },
    ],
  },
  {
    surfaceId: "public-survey-link",
    consumes: [
      { kind: "domain-loader", domainId: "domain:open-link-entry" },
      { kind: "domain-loader", domainId: "domain:surveys" },
    ],
  },
  {
    surfaceId: "public-secure-link",
    consumes: [
      { kind: "domain-loader", domainId: "domain:secure-link-entry" },
      { kind: "domain-loader", domainId: "domain:surveys" },
    ],
  },
  {
    surfaceId: "org-login",
    consumes: [{ kind: "auth-operation", operationId: "auth:sign-in/email" }],
  },
  {
    surfaceId: "shell-dashboard",
    consumes: [
      { kind: "server-action", actionId: "action:requireAdminSession" },
      { kind: "domain-loader", domainId: "domain:auth" },
    ],
  },
  {
    surfaceId: "client-preview-banner",
    consumes: [
      { kind: "server-action", actionId: "action:exitClientPreviewAction" },
      { kind: "domain-loader", domainId: "domain:preview-client" },
      { kind: "domain-loader", domainId: "domain:clients" },
    ],
  },
];

/** Server action → domain modules materialized at runtime. */
export const ACTION_DOMAIN_MATERIALIZATION: ReadonlyArray<{
  actionId: string;
  file: string;
  domains: readonly string[];
}> = [
  {
    actionId: "action:requireClientSession",
    file: "lib/auth/session.ts",
    domains: ["domain:auth", "domain:clients"],
  },
  {
    actionId: "action:requireAdminSession",
    file: "lib/auth/session.ts",
    domains: ["domain:auth"],
  },
  {
    actionId: "action:requireAccountSession",
    file: "lib/account-session.ts",
    domains: ["domain:auth", "domain:clients"],
  },
  {
    actionId: "action:saveClientOnboardingAction",
    file: "app/actions/client.ts",
    domains: ["domain:clients", "domain:audit", "domain:auth"],
  },
  {
    actionId: "action:issueClientInviteAction",
    file: "app/actions/client.ts",
    domains: ["domain:clients", "domain:auth", "domain:audit", "domain:email"],
  },
  {
    actionId: "action:removeClientRegistrationAction",
    file: "app/actions/client.ts",
    domains: ["domain:clients", "domain:auth", "domain:audit"],
  },
  {
    actionId: "action:submitClientDeclarationAction",
    file: "app/actions/client.ts",
    domains: ["domain:surveys", "domain:questions", "domain:clients", "domain:audit"],
  },
  {
    actionId: "action:saveClientDeclarationDraftAction",
    file: "app/actions/client.ts",
    domains: ["domain:clients", "domain:surveys", "domain:questions"],
  },
  {
    actionId: "action:postClientDeclarationDraftApi",
    file: "lib/api/client-declaration-draft-route.ts",
    domains: ["domain:clients", "domain:auth"],
  },
  {
    actionId: "action:deleteClientAssignmentAction",
    file: "app/actions/client.ts",
    domains: ["domain:clients", "domain:audit"],
  },
  {
    actionId: "action:acknowledgeClientPortalAction",
    file: "app/actions/client.ts",
    domains: ["domain:clients", "domain:audit"],
  },
  {
    actionId: "action:createDraftSurveyAction",
    file: "app/actions/surveys.ts",
    domains: ["domain:surveys", "domain:audit"],
  },
  {
    actionId: "action:updateSurveyAction",
    file: "app/actions/surveys.ts",
    domains: ["domain:surveys", "domain:questions", "domain:audit"],
  },
  {
    actionId: "action:deleteSurveyAction",
    file: "app/actions/surveys.ts",
    domains: ["domain:surveys", "domain:audit"],
  },
  {
    actionId: "action:exportSurveyPackageAction",
    file: "app/actions/surveys.ts",
    domains: ["domain:survey-package", "domain:surveys"],
  },
  {
    actionId: "action:importSurveyPackageAction",
    file: "app/actions/surveys.ts",
    domains: ["domain:survey-package", "domain:surveys", "domain:questions", "domain:audit"],
  },
  {
    actionId: "action:submitSurveyResponseAction",
    file: "app/actions/surveys.ts",
    domains: ["domain:surveys", "domain:questions", "domain:clients", "domain:audit"],
  },
  {
    actionId: "action:registerEvidenceAction",
    file: "app/actions/declarations.ts",
    domains: ["domain:questions", "domain:surveys", "domain:clients", "domain:audit"],
  },
  {
    actionId: "action:regenerateInviteTokenAction",
    file: "app/actions/surveys.ts",
    domains: ["domain:surveys", "domain:audit"],
  },
  {
    actionId: "action:startClientPreviewAction",
    file: "app/actions/admin.ts",
    domains: ["domain:preview-client", "domain:audit"],
  },
  {
    actionId: "action:exitClientPreviewAction",
    file: "app/actions/admin.ts",
    domains: ["domain:preview-client", "domain:audit"],
  },
];

export const DOMAIN_MODULE_DEFINITIONS: ReadonlyArray<{
  id: string;
  label: string;
  path: string;
}> = [
  { id: "domain:surveys", label: "Surveys", path: "lib/domain/surveys.ts" },
  { id: "domain:questions", label: "Questions", path: "lib/domain/questions.ts" },
  { id: "domain:clients", label: "Clients", path: "lib/domain/clients.ts" },
  { id: "domain:audit", label: "Audit", path: "lib/domain/audit.ts" },
  { id: "domain:auth", label: "Auth", path: "lib/auth/" },
  { id: "domain:email", label: "Email", path: "lib/email/" },
  { id: "domain:survey-package", label: "Survey package", path: "lib/domain/survey-package.ts" },
  { id: "domain:client-onboarding", label: "Client onboarding", path: "lib/client-onboarding.server.ts" },
  { id: "domain:client-invitation-entry", label: "Invitation entry", path: "lib/entry/client-invitation-entry.ts" },
  { id: "domain:open-link-entry", label: "Open link entry", path: "lib/entry/open-link-entry.ts" },
  { id: "domain:secure-link-entry", label: "Secure link entry", path: "lib/entry/secure-link-entry.ts" },
  { id: "domain:operator-dashboard-page", label: "Operator dashboard", path: "lib/pages/operator-dashboard-page.ts" },
  { id: "domain:operator-clients-page", label: "Operator clients", path: "lib/pages/operator-clients-page.ts" },
  { id: "domain:operator-declaration-detail", label: "Operator declaration detail", path: "lib/pages/operator-declaration-detail.tsx" },
  { id: "domain:declaration-share-links", label: "Declaration share links", path: "lib/domain/declaration-share-links.ts" },
  { id: "domain:preview-client", label: "Preview client", path: "lib/preview-client.ts" },
];

export const AUTH_OPERATION_DEFINITIONS: ReadonlyArray<{
  id: string;
  label: string;
  method: string;
  path: string;
}> = [
  { id: "auth:sign-in/email", label: "Email sign-in", method: "POST", path: "/api/auth/sign-in/email" },
  { id: "auth:sign-up/email", label: "Email sign-up", method: "POST", path: "/api/auth/sign-up/email" },
  { id: "auth:email-otp", label: "Email OTP verify", method: "POST", path: "/api/auth/email-otp/verify-email" },
  { id: "auth:forget-password", label: "Forgot password", method: "POST", path: "/api/auth/forget-password" },
  { id: "auth:reset-password", label: "Reset password", method: "POST", path: "/api/auth/reset-password" },
  {
    id: "auth:organization/accept-invitation",
    label: "Accept org invitation",
    method: "POST",
    path: "/api/auth/organization/accept-invitation",
  },
  {
    id: "auth:organization/invite-member",
    label: "Invite org member",
    method: "POST",
    path: "/api/auth/organization/invite-member",
  },
];

/** DB/fixture materialization checks — not the same namespace as `SURFACE_RELIANCE` product surfaces. */
export const UI_SYNC_SURFACE_CHECKS: readonly string[] = [
  "admin-dashboard",
  "admin-declaration-detail",
  "admin-survey-detail-playground",
  "client-declare",
  "client-dashboard",
  "user-menu",
  "client-declare-assignment",
  "client-declare-playground",
  "public-secure-link",
  "public-survey-slug",
  "shell-dashboard",
  "data-integrity",
];

export const PORTAL_CCP_DEFINITIONS = [
  {
    id: "CCP-RG-001",
    control: "Reliance graph export freshness",
    gateCommand: "check:reliance-graph-drift",
  },
  {
    id: "CCP-RG-002",
    control: "Reliance mapping declared↔discovered compare",
    gateCommand: "check:reliance-mapping-drift",
  },
  {
    id: "CCP-RG-003",
    control: "Reliance registry matches static source scan",
    gateCommand: "check:reliance-coverage",
  },
  {
    id: "CCP-A1",
    control: "Authentication boundary",
    gateCommand: "check:proxy",
  },
  {
    id: "CCP-A2",
    control: "Operator authorization",
    gateCommand: "check:proxy",
  },
  {
    id: "CCP-V1",
    control: "Input validation (Zod)",
    gateCommand: "test:unit",
  },
  {
    id: "CCP-D2",
    control: "Migration gate",
    gateCommand: "check:db-schema",
  },
  {
    id: "CCP-UI-001",
    control: "UI surface registry completeness",
    gateCommand: "evaluate:ui-matrix",
  },
  {
    id: "CCP-UI-002",
    control: "FE/BE data materialization",
    gateCommand: "check:ui-sync",
  },
  {
    id: "CCP-NA-001",
    control: "Neon Auth manifest truth",
    gateCommand: "audit:neon-auth-production",
  },
] as const;

export const PORTAL_RELIANCE_SLICES = [
  {
    id: "RG-S1",
    priority: "P1",
    status: "delivered" as const,
    summary: "Reliance registry + materialized graph export",
  },
  {
    id: "RG-S2",
    priority: "P1",
    status: "delivered" as const,
    summary: "Static import analysis + coverage gate for surface→action edges",
  },
  {
    id: "RG-S3",
    priority: "P2",
    status: "planned" as const,
    summary: "Optional graph visualization (Storybook / docs)",
  },
] as const;
