/**
 * UI evaluation matrix — scored suitability of shadcn studio blocks per portal surface.
 * Block metadata sourced via shadcn-studio MCP get-block-meta-content (2026-07-07).
 */

export const CRITERION_WEIGHTS = {
  PatternFit: 0.25,
  BrandFit: 0.2,
  PortalCompat: 0.2,
  A11yMobile: 0.15,
  ImplCost: 0.1,
  Consistency: 0.1,
} as const;

export type UiCriterion = keyof typeof CRITERION_WEIGHTS;

export type UiCriterionScores = Record<UiCriterion, number>;

export type UiCandidateEvaluation = {
  blockSlug: string;
  scores: UiCriterionScores;
  weightedTotal: number;
  notes: string;
};

export type ValidationStatus = "pending" | "story-reviewed" | "validated";

/** How the winning (or current) UI is sourced relative to Shadcn Studio registry. */
export type StudioImplementationKind =
  | "studio-installed"
  | "portal-wrapper"
  | "hardcoded"
  | "neon-integrated";

export type StudioSurfaceImplementation = {
  kind: StudioImplementationKind;
  component: string;
  blockSlug?: string;
  notes?: string;
};

export type UiSurfaceMeta = {
  surfaceId: string;
  domain: "auth" | "client" | "admin" | "shared" | "orphan";
  route: string;
  currentComponent: string;
};

export type UiEvaluationRow = {
  surfaceId: string;
  route: string;
  currentComponent: string;
  candidates: UiCandidateEvaluation[];
  winner: string;
  winnerRationale: string;
  validationStatus: ValidationStatus;
  gaps: string[];
};

/** Master registry — 41 active surfaces (orphan auth components removed 2026-07). */
export const UI_SURFACE_REGISTRY: UiSurfaceMeta[] = [
  // Auth & account (11)
  { surfaceId: "auth-sign-in", domain: "auth", route: "/auth/sign-in", currentComponent: "StudioAuthLoginPage + PortalAuthNeonView" },
  { surfaceId: "auth-sign-up", domain: "auth", route: "/auth/sign-up", currentComponent: "StudioAuthLoginPage + PortalAuthNeonView" },
  { surfaceId: "auth-forgot-password", domain: "auth", route: "/auth/forgot-password", currentComponent: "StudioAuthLoginPage + PortalAuthNeonView" },
  { surfaceId: "auth-reset-password", domain: "auth", route: "/auth/reset-password", currentComponent: "StudioAuthLoginPage + PortalAuthNeonView" },
  { surfaceId: "auth-sign-out", domain: "auth", route: "/auth/sign-out", currentComponent: "PortalAuthNeonView" },
  { surfaceId: "auth-email-otp", domain: "auth", route: "/auth/email-otp", currentComponent: "StudioAuthLoginPage + PortalAuthNeonView" },
  { surfaceId: "auth-magic-link", domain: "auth", route: "/auth/magic-link", currentComponent: "StudioAuthLoginPage + PortalAuthNeonView" },
  { surfaceId: "auth-accept-invitation", domain: "auth", route: "/auth/accept-invitation", currentComponent: "StudioAuthLoginPage + PortalAuthNeonView (redirects to /join when invitationId present)" },
  { surfaceId: "org-login", domain: "auth", route: "/org/login", currentComponent: "runOrgSignInEntryPage → /auth/sign-in?from=org" },
  { surfaceId: "account-settings", domain: "auth", route: "/account/settings", currentComponent: "PortalAccountNeonView" },
  { surfaceId: "account-security", domain: "auth", route: "/account/security", currentComponent: "PortalAccountNeonView" },
  // Client portal (11)
  { surfaceId: "client-dashboard", domain: "client", route: "/client", currentComponent: "Workspace unavailable (product UI tombstoned)" },
  { surfaceId: "client-onboarding", domain: "client", route: "/client/onboarding", currentComponent: "Onboarding unavailable (wizard tombstoned)" },
  { surfaceId: "client-profile", domain: "client", route: "/client/profile", currentComponent: "Workspace unavailable (product UI tombstoned)" },
  { surfaceId: "client-declare", domain: "client", route: "/client/declare/[id]", currentComponent: "Workspace unavailable (product UI tombstoned); gate logic retained" },
  { surfaceId: "client-declare-receipt", domain: "client", route: "/client/declare/[id] (submitted)", currentComponent: "Deferred with declare rebuild (logic retained)" },
  { surfaceId: "client-declare-empty", domain: "client", route: "/client/declare/[id] (no data)", currentComponent: "Deferred with declare rebuild (logic retained)" },
  { surfaceId: "client-acknowledgement", domain: "client", route: "/client", currentComponent: "Deferred with dashboard rebuild (acknowledgeClientPortalAction retained)" },
  { surfaceId: "client-login", domain: "client", route: "/client/login", currentComponent: "runClientSignInEntryPage → /auth/sign-in" },
  { surfaceId: "client-preview-unavailable", domain: "client", route: "/client/preview-unavailable", currentComponent: "ClientPreviewUnavailableView" },
  { surfaceId: "client-preview-banner", domain: "client", route: "/client (preview mode)", currentComponent: "PortalPreviewBanner (dormant — workspace shell deferred)" },
  { surfaceId: "client-home-redirect", domain: "client", route: "/", currentComponent: "LynxLandingPage → Vanguard unlock → Neon Auth" },
  { surfaceId: "client-join", domain: "client", route: "/join", currentComponent: "StudioInvitationJoinPage + Neon" },
  { surfaceId: "public-survey-link", domain: "client", route: "/survey/[slug]", currentComponent: "runOpenLinkPage (redirect-only)" },
  { surfaceId: "public-secure-link", domain: "client", route: "/f/[token]", currentComponent: "runSecureLinkPage (redirect-only)" },
  // Admin (6)
  { surfaceId: "admin-dashboard", domain: "admin", route: "/dashboard", currentComponent: "PortalDeclarationsDatatable" },
  { surfaceId: "admin-clients", domain: "admin", route: "/dashboard/clients", currentComponent: "PortalClientInvitationsTable" },
  { surfaceId: "admin-declaration-detail", domain: "admin", route: "/dashboard/[id]", currentComponent: "operator-declaration-detail (portal-views)" },
  { surfaceId: "admin-create-declaration", domain: "admin", route: "/dashboard/[id] (create)", currentComponent: "Inline create form" },
  { surfaceId: "admin-issue-invite", domain: "admin", route: "/dashboard/clients (invite)", currentComponent: "IssueClientInviteForm" },
  { surfaceId: "admin-access-share", domain: "admin", route: "/dashboard/[id] (share)", currentComponent: "PortalAccessSharePanel" },
  // Shared (12)
  { surfaceId: "shell-auth", domain: "shared", route: "/auth/* + /join", currentComponent: "StudioAuthShell + PortalAuthNeonView" },
  { surfaceId: "shell-customer", domain: "shared", route: "PortalCustomerShell", currentComponent: "PortalCustomerShell" },
  { surfaceId: "shell-dashboard", domain: "shared", route: "/dashboard layout", currentComponent: "Dashboard sidebar layout" },
  { surfaceId: "sidebar-client", domain: "shared", route: "ClientSidebar", currentComponent: "ClientSidebar" },
  { surfaceId: "sidebar-playground", domain: "shared", route: "PlaygroundSidebar", currentComponent: "PlaygroundSidebar" },
  { surfaceId: "error-route", domain: "shared", route: "PortalRouteError", currentComponent: "PortalRouteError" },
  { surfaceId: "error-404", domain: "shared", route: "/not-found", currentComponent: "app/not-found.tsx" },
  { surfaceId: "error-boundary-client", domain: "shared", route: "app/client/error.tsx", currentComponent: "PortalRouteError" },
  { surfaceId: "error-boundary-dashboard", domain: "shared", route: "app/dashboard/error.tsx", currentComponent: "PortalRouteError" },
  { surfaceId: "trust-notice", domain: "shared", route: "PortalTrustNotice", currentComponent: "PortalTrustNotice" },
  { surfaceId: "faq-section", domain: "shared", route: "PortalFaqSection", currentComponent: "PortalFaqSection" },
  { surfaceId: "user-menu", domain: "shared", route: "PortalMemberMenu", currentComponent: "PortalMemberMenu" },
];

export function computeWeightedTotal(scores: UiCriterionScores): number {
  let total = 0;
  for (const [key, weight] of Object.entries(CRITERION_WEIGHTS) as [UiCriterion, number][]) {
    total += scores[key] * weight;
  }
  return Math.round(total * 100) / 100;
}

function c(
  blockSlug: string,
  scores: UiCriterionScores,
  notes: string,
): UiCandidateEvaluation {
  return { blockSlug, scores, weightedTotal: computeWeightedTotal(scores), notes };
}

function row(
  meta: UiSurfaceMeta,
  candidates: UiCandidateEvaluation[],
  winner: string,
  winnerRationale: string,
  validationStatus: ValidationStatus,
  gaps: string[] = [],
): UiEvaluationRow {
  const sorted = [...candidates].sort((a, b) => b.weightedTotal - a.weightedTotal);
  return {
    surfaceId: meta.surfaceId,
    route: meta.route,
    currentComponent: meta.currentComponent,
    candidates: sorted,
    winner,
    winnerRationale,
    validationStatus,
    gaps,
  };
}

const S = UI_SURFACE_REGISTRY;
const byId = (id: string) => S.find((s) => s.surfaceId === id)!;

/** Scored evaluation for every UI_SURFACE_REGISTRY entry. */
export const uiEvaluationMatrix: UiEvaluationRow[] = [
  // ── Auth (Studio login-page-02 chrome + Neon AuthView) ─────────────────────
  row(byId("auth-sign-in"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Studio login-page-02 chrome + Neon AuthView (ADR-Auth-UI-001 amended)."),
    c("login-page-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "login-page-02 is production chrome SSOT; Neon in form slot."),
    c("login-page-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Centered card loses trust-hero column; social-login slots unused."),
    c("login-page-03", { PatternFit: 2, BrandFit: 2, PortalCompat: 2, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "Testimonial/avatar strip is consumer SaaS, not legal vault."),
  ], "keep-current", "Studio login-page-02 chrome + Neon AuthView.", "validated", ["Social login slots in studio blocks unused"]),

  row(byId("auth-sign-up"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon sign-up flow with shared auth shell."),
    c("register-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 2, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Marketing register block replaces Neon auth logic."),
    c("login-page-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 2, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Sign-up variant of centered login; no vault hero."),
  ], "keep-current", "register-01 scores 2.85 vs keep-current 5.0 — Neon handles provisioning; studio block is layout-only reference.", "validated"),

  row(byId("auth-forgot-password"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon forgot-password inside Studio auth shell."),
    c("forgot-password-01", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Standalone marketing forgot-password; good pattern reference."),
    c("login-page-02", { PatternFit: 3, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Generic login shell, not forgot-password specific."),
  ], "keep-current", "forgot-password-01 PatternFit 4.0 but PortalCompat 3.0 — cannot replace Neon token flow.", "validated"),

  row(byId("auth-reset-password"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon reset-password with email token handling."),
    c("reset-password-01", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Marketing reset block; layout reference only."),
    c("login-page-01", { PatternFit: 2, BrandFit: 3, PortalCompat: 2, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "Wrong pattern for password reset."),
  ], "keep-current", "reset-password-01 is closest studio analog but lacks Neon token integration.", "validated"),

  row(byId("auth-sign-out"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon sign-out route handler."),
    c("login-page-01", { PatternFit: 1, BrandFit: 3, PortalCompat: 1, A11yMobile: 3, ImplCost: 1, Consistency: 2 }, "Not applicable to sign-out."),
  ], "keep-current", "No studio block covers sign-out; Neon only option.", "validated"),

  row(byId("auth-email-otp"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon AuthView email-otp inside NeonAuthPageShell; PortalAuthEmailTrustNotice on sign-up and OTP paths."),
    c("login-page-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "login-page-02 is production chrome SSOT; Neon in form slot."),
    c("login-page-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Centered card loses trust-hero column; social-login slots unused."),
    c("login-page-03", { PatternFit: 2, BrandFit: 2, PortalCompat: 2, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "Testimonial/avatar strip is consumer SaaS, not legal vault."),
  ], "keep-current", "Studio login-page-02 chrome + Neon AuthView.", "validated", ["Social login slots in studio blocks unused"]),

  row(byId("auth-magic-link"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon AuthView magic-link inside NeonAuthPageShell; PortalAuthEmailTrustNotice on magic-link path."),
    c("login-page-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "login-page-02 is production chrome SSOT; Neon in form slot."),
    c("login-page-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Centered card loses trust-hero column; social-login slots unused."),
    c("login-page-03", { PatternFit: 2, BrandFit: 2, PortalCompat: 2, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "Testimonial/avatar strip is consumer SaaS, not legal vault."),
  ], "keep-current", "Studio login-page-02 chrome + Neon AuthView.", "validated", ["Social login slots in studio blocks unused"]),

  row(byId("auth-accept-invitation"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon AuthView accept-invitation; canonical client entry is /join with invitationId."),
    c("login-page-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "login-page-02 is production chrome SSOT; Neon in form slot."),
    c("login-page-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Centered card loses trust-hero column; social-login slots unused."),
    c("login-page-03", { PatternFit: 2, BrandFit: 2, PortalCompat: 2, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "Testimonial/avatar strip is consumer SaaS, not legal vault."),
  ], "keep-current", "Beats login-page-02 on PortalCompat (+2) and ImplCost (+3) because Neon AuthView is integrated; prefer /join for org invites.", "validated", ["Redirects to /join when invitationId query param is present"]),

  row(byId("org-login"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Server redirect entry dispatches session then Neon Auth org sign-in shell."),
    c("login-page-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "login-page-02 is production chrome SSOT; Neon in form slot."),
    c("login-page-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Centered card loses trust-hero column; social-login slots unused."),
    c("login-page-03", { PatternFit: 2, BrandFit: 2, PortalCompat: 2, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "Testimonial/avatar strip is consumer SaaS, not legal vault."),
  ], "keep-current", "Beats login-page-02 on PortalCompat (+2) and ImplCost (+3) — org entry is redirect-only; Neon AuthView renders at /auth/sign-in?from=org.", "validated"),

  row(byId("account-settings"), [
    c("keep-current", { PatternFit: 5, BrandFit: 4, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon AccountView settings tab."),
    c("account-settings-01", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Rich settings sections; adopt layout chrome around AccountView."),
    c("form-layout-05", { PatternFit: 3, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 3 }, "Tabbed profile form; overlaps account-settings-01."),
  ], "keep-current", "account-settings-01 scores 3.75 for layout inspiration; keep-current wins ImplCost and PortalCompat for Neon integration.", "validated", ["Image upload and social URL sections not needed"]),

  row(byId("account-security"), [
    c("keep-current", { PatternFit: 5, BrandFit: 4, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Neon AccountView security / change-password."),
    c("account-settings-06", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "2FA/sessions/API keys — future chrome reference."),
    c("account-settings-01", { PatternFit: 3, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 3 }, "Email/password section only partially matches."),
  ], "keep-current", "account-settings-06 security patterns useful later; Neon change-password is live MVP.", "validated", ["2FA block not wired to Neon yet"]),

  // ── Client portal ─────────────────────────────────────────────────────────
  row(byId("client-dashboard"), [
    c("statistics-component-03", { PatternFit: 5, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 4, Consistency: 5 }, "KPI cards with trend badges — fits declaration counts."),
    c("statistics-component-01", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 4, Consistency: 4 }, "Logistics KPIs; less semantic for legal portal."),
    c("keep-current", { PatternFit: 3, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 3 }, "Custom cards work but lack standard KPI pattern."),
    c("widgets-component-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 3, ImplCost: 3, Consistency: 3 }, "Heavier widgets than needed."),
  ], "statistics-component-03", "Wins PatternFit (+1) over statistics-component-01 for generic KPI/trend cards; keep-current ImplCost higher but PatternFit lower.", "validated"),

  row(byId("client-onboarding"), [
    c("multi-step-form-01", { PatternFit: 5, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 5 }, "Stepper for profile collection; matches onboarding flow."),
    c("form-layout-09", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Horizontal stepper with RHF; payment steps irrelevant."),
    c("keep-current", { PatternFit: 3, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "PortalFormSection single-page; no step progress."),
    c("onboarding-feed-01", { PatternFit: 2, BrandFit: 3, PortalCompat: 2, A11yMobile: 3, ImplCost: 2, Consistency: 2 }, "Feed/timeline pattern wrong for form onboarding."),
  ], "multi-step-form-01", "Beats keep-current on PatternFit (+2) for step navigation; loses ImplCost (-2) — adopt stepper chrome, keep server actions.", "validated", ["Billing/payment steps in block must be stripped"]),

  row(byId("client-profile"), [
    c("form-layout-01", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "PortalFormSection + PortalProfileField read-only grid."),
    c("form-layout-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Three-section settings; overkill for declarant profile."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 5 }, "ClientDeclarantProfileView uses PortalFormSection."),
  ], "form-layout-01", "form-layout-01 and keep-current tie on weighted score; block is canonical pattern name.", "validated"),

  row(byId("client-declare"), [
    c("form-layout-01", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 4, Consistency: 5 }, "Sectioned form with grid body."),
    c("form-layout-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Multi-section with notifications — not needed."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "Working declaration form."),
  ], "form-layout-01", "Align declaration sections to form-layout-01 grid; keep-current viable until block install phase.", "validated"),

  row(byId("client-declare-receipt"), [
    c("empty-state-01", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 4, Consistency: 5 }, "Success/confirmation card pattern."),
    c("multi-step-form-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Complete-step only; heavy dependency."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "Inline receipt works."),
  ], "empty-state-01", "empty-state-01 card pattern fits confirmation; marginal over keep-current (+0.15).", "validated"),

  row(byId("client-declare-empty"), [
    c("empty-state-02", { PatternFit: 5, BrandFit: 4, PortalCompat: 5, A11yMobile: 5, ImplCost: 4, Consistency: 5 }, "CTA empty state with action button."),
    c("empty-state-01", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Metric placeholder; less actionable."),
    c("keep-current", { PatternFit: 3, BrandFit: 4, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 3 }, "Inline empty message."),
  ], "empty-state-02", "empty-state-02 wins PatternFit (+1) with CTA to return to dashboard.", "validated"),

  row(byId("client-acknowledgement"), [
    c("form-layout-01", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 4, Consistency: 5 }, "Single-section acknowledgement form."),
    c("empty-state-01", { PatternFit: 3, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 4, Consistency: 4 }, "No form inputs in empty state."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "Inline acknowledgement."),
  ], "form-layout-01", "Tie with keep-current; form-layout-01 named pattern for checkbox + submit section.", "validated"),

  row(byId("client-preview-unavailable"), [
    c("empty-state-01", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 4, Consistency: 5 }, "Informational zero-state card."),
    c("error-page-02", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 3 }, "404-style; wrong semantics for preview gate."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "Custom notice page."),
  ], "empty-state-01", "empty-state-01 PatternFit 5.0 vs keep-current 4.0 — standardize notice as empty-state card.", "validated"),

  row(byId("client-login"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Named entry dispatches session then Neon Auth sign-in."),
    c("login-page-02", { PatternFit: 2, BrandFit: 3, PortalCompat: 2, A11yMobile: 3, ImplCost: 1, Consistency: 2 }, "Static login shell duplicates /auth/sign-in."),
  ], "keep-current", "Gate route mirrors org-login — redirect-only entry for share links and QR codes.", "validated"),

  row(byId("client-preview-banner"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "PortalPreviewBanner exit strip in PortalCustomerShell during operator preview."),
    c("empty-state-01", { PatternFit: 3, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 3 }, "Zero-state card pattern; wrong for persistent session chrome."),
  ], "keep-current", "Inline banner is correct UX for preview mode; studio empty-state is layout reference only.", "validated"),

  row(byId("client-home-redirect"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Lynx Vanguard unlock; shield reveals Sign in + Sign up; authed session-skip."),
    c("login-page-02", { PatternFit: 3, BrandFit: 3, PortalCompat: 2, A11yMobile: 3, ImplCost: 2, Consistency: 3 }, "Auth chrome is for /auth/* — not the public brand landing."),
  ], "keep-current", "Public `/` landing (proxy matcher excludes `/`); invitationId→/join; named /client/login still redirects to Neon.", "validated"),

  row(byId("client-join"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "StudioInvitationJoinPage + Neon join panel."),
    c("login-page-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "login-page-02 chrome SSOT for /join."),
    c("login-page-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Centered card loses invitation stepper and trust hero."),
  ], "keep-current", "Primary client invitation entry; Neon accept-invitation embedded in join panel.", "validated"),

  row(byId("public-survey-link"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Server redirect from /survey/[slug] to client auth assignment flow."),
    c("login-page-02", { PatternFit: 2, BrandFit: 3, PortalCompat: 2, A11yMobile: 3, ImplCost: 1, Consistency: 2 }, "Static login shell is wrong surface for redirect-only entry."),
  ], "keep-current", "Open link is redirect-only; no studio block replaces runOpenLinkPage routing.", "validated"),

  row(byId("public-secure-link"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Server redirect from /f/[token] to client auth assignment flow."),
    c("login-page-02", { PatternFit: 2, BrandFit: 3, PortalCompat: 2, A11yMobile: 3, ImplCost: 1, Consistency: 2 }, "Static login shell is wrong surface for redirect-only entry."),
  ], "keep-current", "Secure link is redirect-only; no studio block replaces runSecureLinkPage routing.", "validated"),

  // ── Admin ─────────────────────────────────────────────────────────────────
  row(byId("admin-dashboard"), [
    c("datatable-component-05", { PatternFit: 5, BrandFit: 4, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 5 }, "AdminCN DataTable 05 (invoice) forked as PortalDeclarationsDatatable; stats from statistics-card-05 DNA."),
    c("statistics-component-03", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "StudioStatisticsCard installed for admin + client KPI rows."),
    c("keep-current", { PatternFit: 2, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "Superseded: custom FilteredDataTable removed 2026-07."),
  ], "datatable-component-05", "datatable-component-05 (invoice) forked for declarations; statistics-card-05 DNA for KPI strip.", "validated", ["KPI row: statistics-card-05 DNA via PortalOrganizationAdminStatisticsCard"]),

  row(byId("admin-clients"), [
    c("datatable-component-04", { PatternFit: 5, BrandFit: 4, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "AdminCN Table in portal-views; portal-client-tables supplies portal columns."),
    c("datatable-component-01", { PatternFit: 4, BrandFit: 4, PortalCompat: 5, A11yMobile: 4, ImplCost: 4, Consistency: 4 }, "Transaction table; less role/filter fit."),
    c("keep-current", { PatternFit: 2, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "Superseded: custom FilteredDataTable removed 2026-07."),
  ], "datatable-component-04", "datatable-component-04 installed; PatternFit (+3) and A11yMobile (+1) over superseded custom table.", "validated"),

  row(byId("admin-declaration-detail"), [
    c("dashboard-shell-05", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 5 }, "Tabbed detail shell with sidebar."),
    c("form-layout-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Multi-section settings for manage tab."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "Working tabbed detail."),
  ], "dashboard-shell-05", "dashboard-shell-05 Consistency 5.0 aligns admin shell family; marginal over keep-current.", "validated", ["Share/submissions tabs need custom panels"]),

  row(byId("admin-create-declaration"), [
    c("form-layout-01", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Single-section create form."),
    c("form-layout-03", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "SaaS plan selection irrelevant."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "Inline create form."),
  ], "form-layout-01", "form-layout-01 already matches PortalFormSection pattern used elsewhere.", "validated"),

  row(byId("admin-issue-invite"), [
    c("form-layout-01", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Compact invite form section."),
    c("dashboard-dialog-01", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Dialog variant possible for invite modal."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "IssueClientInviteForm."),
  ], "form-layout-01", "form-layout-01 Consistency 5.0 with other admin forms; dialog optional enhancement.", "validated"),

  row(byId("admin-access-share"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 5 }, "PortalAccessSharePanel in portal-views via DeclarationSharePanel."),
    c("form-layout-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 4 }, "Multi-section with copy/share fields — layout DNA only."),
    c("empty-state-02", { PatternFit: 3, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 3 }, "CTA pattern partial fit."),
  ], "keep-current", "PortalAccessSharePanel shipped in AdminCN portal-views; form-layout-02 remains layout reference.", "validated"),

  // ── Shared ────────────────────────────────────────────────────────────────
  row(byId("shell-auth"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "StudioAuthShell + trust notices on /auth/* and /join."),
    c("login-page-02", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "Two-column reference; motion dependency."),
    c("login-page-01", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 3 }, "Centered card loses brand hero."),
  ], "keep-current", "StudioAuthShell + Neon; Guardian experiment-only (Storybook removed).", "validated"),

  row(byId("shell-customer"), [
    c("dashboard-shell-05", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 5 }, "Client app shell with sidebar."),
    c("application-shell", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "Full app shell; heavier migration."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "PortalCustomerShell."),
  ], "dashboard-shell-05", "dashboard-shell-05 Consistency 5.0 with admin shell; keep-current BrandFit + ImplCost lead short-term.", "validated"),

  row(byId("shell-dashboard"), [
    c("dashboard-shell-05", { PatternFit: 5, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 3, Consistency: 5 }, "Standard admin dashboard shell."),
    c("application-shell", { PatternFit: 4, BrandFit: 4, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 4 }, "Enterprise shell; overkill."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "Custom sidebar layout."),
  ], "dashboard-shell-05", "dashboard-shell-05 PatternFit 5.0 for operator dashboard; strong recommendation (gap 0.55).", "validated"),

  row(byId("sidebar-client"), [
    c("dashboard-sidebar", { PatternFit: 5, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 4, Consistency: 5 }, "Purpose-built sidebar nav block."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "ClientSidebar."),
  ], "dashboard-sidebar", "dashboard-sidebar PatternFit 5.0; adopt nav tokens from block.", "validated"),

  row(byId("sidebar-playground"), [
    c("dashboard-sidebar", { PatternFit: 4, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 4, Consistency: 5 }, "Same sidebar family as client/admin."),
    c("keep-current", { PatternFit: 4, BrandFit: 4, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "PlaygroundSidebar."),
  ], "dashboard-sidebar", "Consistency with client sidebar; playground-only surface.", "validated"),

  row(byId("error-route"), [
    c("empty-state-01", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Already partially adopted in PortalRouteError."),
    c("error-page-02", { PatternFit: 3, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 3 }, "Full-page 404 style for route errors."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "PortalRouteError with retry."),
  ], "empty-state-01", "empty-state-01 and keep-current tie; block name documents the pattern.", "validated"),

  row(byId("error-404"), [
    c("error-page-02", { PatternFit: 5, BrandFit: 4, PortalCompat: 4, A11yMobile: 5, ImplCost: 4, Consistency: 4 }, "Centered minimal 404 with home CTA."),
    c("error-page-01", { PatternFit: 4, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 3, Consistency: 3 }, "Astronaut illustration too playful for vault."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "app/not-found.tsx."),
  ], "error-page-02", "error-page-02 BrandFit 4.0 beats error-page-01 3.0; minimal centered layout fits portal.", "validated"),

  row(byId("error-boundary-client"), [
    c("empty-state-01", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Same as error-route via PortalRouteError."),
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Delegates to PortalRouteError."),
  ], "keep-current", "Already uses PortalRouteError (empty-state-01 pattern).", "validated"),

  row(byId("error-boundary-dashboard"), [
    c("empty-state-01", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "Same as error-route."),
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 5 }, "Delegates to PortalRouteError."),
  ], "keep-current", "Identical to error-boundary-client; no change needed.", "validated"),

  row(byId("trust-notice"), [
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 5, ImplCost: 5, Consistency: 5 }, "PortalTrustNotice legal copy — domain-specific."),
    c("faq-component-01", { PatternFit: 2, BrandFit: 3, PortalCompat: 3, A11yMobile: 4, ImplCost: 2, Consistency: 2 }, "FAQ accordion wrong pattern for trust banner."),
  ], "keep-current", "No studio block replaces legal trust notice.", "validated"),

  row(byId("faq-section"), [
    c("faq-component-01", { PatternFit: 5, BrandFit: 4, PortalCompat: 4, A11yMobile: 5, ImplCost: 4, Consistency: 4 }, "Accordion FAQ pattern."),
    c("keep-current", { PatternFit: 4, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 4 }, "PortalFaqSection."),
  ], "faq-component-01", "faq-component-01 PatternFit 5.0 for expandable help content.", "validated"),

  row(byId("user-menu"), [
    c("dashboard-dropdown-01", { PatternFit: 5, BrandFit: 4, PortalCompat: 4, A11yMobile: 4, ImplCost: 4, Consistency: 5 }, "Profile dropdown with settings/sign-out."),
    c("keep-current", { PatternFit: 5, BrandFit: 5, PortalCompat: 5, A11yMobile: 4, ImplCost: 5, Consistency: 5 }, "PortalMemberMenu with server-synced Neon Auth + client_profiles displayName."),
  ], "keep-current", "PortalMemberMenu implements dashboard-dropdown-01 pattern with live DB member sync (legal name > auth name > email).", "validated", ["Auth name must stay in sync on onboarding save"]),
];

/**
 * Current implementation source per surface (2026-07-08).
 * Registry: @ss-blocks/base-nova via npm run studio:install-block
 */
export const STUDIO_IMPLEMENTATION_BY_SURFACE: Record<
  string,
  StudioSurfaceImplementation
> = {
  // Auth — Studio login-page-02 chrome + Neon AuthView
  "auth-sign-in": { kind: "neon-integrated", component: "features/auth/studio-auth-login-page.tsx + portal-auth-neon-view.tsx", blockSlug: "login-page-02", notes: "Studio login-page-02 + Neon (ADR-Auth-UI-001 amended)" },
  "auth-sign-up": { kind: "neon-integrated", component: "features/auth/studio-auth-login-page.tsx + portal-auth-neon-view.tsx", blockSlug: "login-page-02", notes: "Studio login-page-02 + Neon (ADR-Auth-UI-001 amended)" },
  "auth-forgot-password": { kind: "neon-integrated", component: "features/auth/studio-auth-login-page.tsx + portal-auth-neon-view.tsx", blockSlug: "login-page-02", notes: "Studio login-page-02 + Neon (ADR-Auth-UI-001 amended)" },
  "auth-reset-password": { kind: "neon-integrated", component: "features/auth/studio-auth-login-page.tsx + portal-auth-neon-view.tsx", blockSlug: "login-page-02", notes: "Studio login-page-02 + Neon (ADR-Auth-UI-001 amended)" },
  "auth-sign-out": { kind: "neon-integrated", component: "features/auth/portal-auth-neon-view.tsx" },
  "auth-email-otp": { kind: "neon-integrated", component: "features/auth/studio-auth-login-page.tsx + portal-auth-neon-view.tsx", blockSlug: "login-page-02", notes: "Studio login-page-02 + Neon (ADR-Auth-UI-001 amended)" },
  "auth-magic-link": { kind: "neon-integrated", component: "features/auth/studio-auth-login-page.tsx + portal-auth-neon-view.tsx", blockSlug: "login-page-02", notes: "Studio login-page-02 + Neon (ADR-Auth-UI-001 amended)" },
  "auth-accept-invitation": { kind: "neon-integrated", component: "features/auth/studio-auth-login-page.tsx + portal-auth-neon-view.tsx", blockSlug: "login-page-02", notes: "Prefer /join?invitationId= for client org invites" },
  "org-login": { kind: "neon-integrated", component: "app/org/login/page.tsx → features/auth/entry/org-sign-in-entry.ts", notes: "Redirect-only entry; Neon AuthView at /auth/sign-in?from=org" },
  "account-settings": { kind: "neon-integrated", component: "features/auth/portal-auth-neon-view.tsx (AccountView)", blockSlug: "account-settings-01", notes: "Studio block installed as chrome reference only — see lib/studio-canonical-kit.ts" },
  "account-security": { kind: "neon-integrated", component: "features/auth/portal-auth-neon-view.tsx (AccountView)", blockSlug: "account-settings-01", notes: "Chrome reference; Neon owns security forms" },
  // Client
  "client-dashboard": { kind: "hardcoded", component: "lib/pages/client-dashboard-page.tsx (unavailable stub)", notes: "Product UI tombstoned; rebuild deferred — acknowledge/submit contracts retained" },
  "client-onboarding": { kind: "hardcoded", component: "lib/pages/client-onboarding-page.tsx (unavailable stub)", notes: "Wizard tombstoned; rebuild deferred — backend saveClientOnboardingAction retained" },
  "client-profile": { kind: "hardcoded", component: "lib/pages/client-profile-page.tsx (unavailable stub)", notes: "Product UI tombstoned; rebuild deferred" },
  "client-declare": { kind: "hardcoded", component: "lib/pages/client-declare-page.tsx (unavailable stub)", notes: "Product UI tombstoned; client-declare-page.logic.ts + submit/draft contracts retained for rebuild" },
  "client-declare-receipt": { kind: "hardcoded", component: "client-declare-page.logic.ts (receipt branch)", blockSlug: "empty-state-01", notes: "UI deferred with declare rebuild; prefer PortalEmptyStateCard on restore" },
  "client-declare-empty": { kind: "hardcoded", component: "client-declare-page.logic.ts (empty-questions branch)", blockSlug: "empty-state-02", notes: "UI deferred with declare rebuild" },
  "client-acknowledgement": { kind: "hardcoded", component: "acknowledgeClientPortalAction (unwired)", blockSlug: "form-layout-01", notes: "ACK UI deferred with dashboard rebuild; action + domain retained" },
  "client-preview-unavailable": { kind: "hardcoded", component: "lib/pages/client-preview-unavailable-page.tsx", blockSlug: "empty-state-01", notes: "Gate path retained; Studio empty-state-01 chrome reference" },
  "client-preview-banner": {
    kind: "hardcoded",
    component: "portal-preview-banner.tsx",
    notes: "Preview-mode exit banner; dormant until client workspace shell rebuild",
  },
  "client-home-redirect": { kind: "hardcoded", component: "features/landing/lynx-landing-page.tsx", notes: "Guest Vanguard unlock landing; authed still session-skips" },
  "client-login": { kind: "neon-integrated", component: "app/client/(gate)/login/page.tsx redirect" },
  "client-join": { kind: "neon-integrated", component: "features/auth/studio-invitation-join-page.tsx", notes: "Studio shell + Neon join (ADR-Auth-UI-001 amended)" },
  "public-survey-link": { kind: "neon-integrated", component: "features/auth/entry/open-link-entry.ts → app/survey/[slug]/page.tsx", notes: "Redirect-only open link entry (S5)" },
  "public-secure-link": { kind: "neon-integrated", component: "features/auth/entry/secure-link-entry.ts → app/f/[token]/page.tsx", notes: "Redirect-only secure link entry (S5)" },
  // Admin
  "admin-dashboard": { kind: "studio-installed", component: "operator-declarations-dashboard.tsx", blockSlug: "datatable-component-05", notes: "AdminCN sales-dashboard composition: statistics-card-05 DNA + DataTable 05 fork" },
  "admin-clients": { kind: "studio-installed", component: "operator-clients-list.tsx", blockSlug: "datatable-component-04", notes: "AdminCN portal-views client invitations/assignments tables" },
  "admin-declaration-detail": { kind: "studio-installed", component: "operator-declaration-detail.tsx", blockSlug: "dashboard-shell-05", notes: "AdminCN portal-views: manage / share / submissions tabs + package tools" },
  "admin-create-declaration": { kind: "studio-installed", component: "portal-create-declaration-button.tsx", blockSlug: "form-layout-01", notes: "Create draft CTA in portal-views" },
  "admin-issue-invite": { kind: "studio-installed", component: "operator-clients-list.tsx → IssueClientInviteForm", blockSlug: "form-layout-01" },
  "admin-access-share": { kind: "studio-installed", component: "portal-access-share-panel.tsx", blockSlug: "form-layout-02", notes: "DeclarationSharePanel loads links; PortalAccessSharePanel renders share UI" },
  // Shared
  "shell-auth": { kind: "portal-wrapper", component: "features/auth/studio-auth-shell.tsx + portal-auth-neon-view.tsx", blockSlug: "login-page-02", notes: "Studio login-page-02 chrome on /auth/* and /join" },
  "shell-customer": { kind: "hardcoded", component: "portal-customer-shell.tsx", blockSlug: "dashboard-shell-05" },
  "shell-dashboard": { kind: "hardcoded", component: "AdminCnShell.tsx + PagesLayout", blockSlug: "dashboard-shell-05" },
  "sidebar-client": { kind: "hardcoded", component: "client-sidebar.tsx", blockSlug: "dashboard-sidebar" },
  "sidebar-playground": { kind: "hardcoded", component: "playground-sidebar.tsx", blockSlug: "dashboard-sidebar" },
  "error-route": { kind: "portal-wrapper", component: "portal-route-error.tsx", blockSlug: "empty-state-01" },
  "error-404": { kind: "portal-wrapper", component: "portal-not-found-page.tsx", blockSlug: "error-page-02" },
  "error-boundary-client": { kind: "portal-wrapper", component: "app/client/error.tsx → portal-route-error.tsx", blockSlug: "empty-state-01" },
  "error-boundary-dashboard": { kind: "portal-wrapper", component: "app/dashboard/error.tsx → portal-route-error.tsx", blockSlug: "empty-state-01" },
  "trust-notice": { kind: "neon-integrated", component: "portal-trust-notice.tsx" },
  "faq-section": { kind: "portal-wrapper", component: "portal-statutory-faq.tsx", blockSlug: "faq-component-01" },
  "user-menu": { kind: "hardcoded", component: "portal-member-menu.tsx", blockSlug: "dashboard-dropdown-01", notes: "Matrix keep-current — implements dropdown pattern with Neon sync" },
};

export function getStudioImplementation(
  surfaceId: string,
): StudioSurfaceImplementation | undefined {
  return STUDIO_IMPLEMENTATION_BY_SURFACE[surfaceId];
}

/** True when registry block is installed and matches matrix winner. */
export function isWinnerAligned(row: UiEvaluationRow): boolean {
  const impl = getStudioImplementation(row.surfaceId);
  if (!impl) return false;
  if (row.winner === "keep-current") {
    return (
      impl.kind === "neon-integrated" ||
      impl.kind === "hardcoded" ||
      impl.kind === "portal-wrapper"
    );
  }
  if (impl.kind === "studio-installed") {
    return impl.blockSlug === row.winner;
  }
  if (impl.kind === "portal-wrapper" || impl.kind === "neon-integrated") {
    return impl.blockSlug === row.winner || row.winner === "keep-current";
  }
  return impl.blockSlug === row.winner;
}

export type StudioAdoptionSummary = {
  studioInstalled: number;
  portalWrapper: number;
  hardcoded: number;
  neonIntegrated: number;
  winnerAligned: number;
  needsRegistryInstall: number;
};

export function getStudioAdoptionSummary(): StudioAdoptionSummary {
  const summary: StudioAdoptionSummary = {
    studioInstalled: 0,
    portalWrapper: 0,
    hardcoded: 0,
    neonIntegrated: 0,
    winnerAligned: 0,
    needsRegistryInstall: 0,
  };

  for (const row of uiEvaluationMatrix) {
    const impl = getStudioImplementation(row.surfaceId);
    if (!impl) continue;

    if (impl.kind === "studio-installed") summary.studioInstalled++;
    else if (impl.kind === "portal-wrapper") summary.portalWrapper++;
    else if (impl.kind === "hardcoded") summary.hardcoded++;
    else if (impl.kind === "neon-integrated") summary.neonIntegrated++;

    if (isWinnerAligned(row)) summary.winnerAligned++;

    if (
      row.winner !== "keep-current" &&
      impl.kind !== "studio-installed" &&
      impl.kind !== "neon-integrated"
    ) {
      summary.needsRegistryInstall++;
    }
  }

  return summary;
}

export function getEvaluationRow(surfaceId: string): UiEvaluationRow | undefined {
  return uiEvaluationMatrix.find((r) => r.surfaceId === surfaceId);
}

export function getWinnerCandidate(row: UiEvaluationRow): UiCandidateEvaluation | undefined {
  return row.candidates.find((c) => c.blockSlug === row.winner)
    ?? row.candidates[0];
}

export type RecommendationStrength = "strong" | "marginal" | "tie";

export function getRecommendationStrength(row: UiEvaluationRow): RecommendationStrength {
  const sorted = [...row.candidates].filter((c) => c.blockSlug !== row.winner);
  const winnerScore = getWinnerCandidate(row)?.weightedTotal ?? 0;
  const runnerUpScore = sorted[0]?.weightedTotal ?? 0;
  const gap = winnerScore - runnerUpScore;
  if (gap >= 0.5) return "strong";
  if (gap >= 0.2) return "marginal";
  return "tie";
}

/** Legacy condensed map for quick lookups. */
export const uiDecisionMatrix = {
  auth: {
    signIn: { block: "keep-current", neon: "AuthView:sign-in", priority: "HIGH" },
    signUp: { block: "keep-current", neon: "AuthView:sign-up", priority: "HIGH" },
    forgotPassword: { block: "keep-current", neon: "AuthView:forgot-password", priority: "HIGH" },
    resetPassword: { block: "keep-current", neon: "AuthView:reset-password", priority: "HIGH" },
    changePassword: { block: "keep-current", neon: "AccountView:security", priority: "HIGH" },
    accountSettings: { block: "keep-current", neon: "AccountView:settings", priority: "HIGH" },
  },
  client: {
    onboarding: { block: "multi-step-form-01", priority: "MEDIUM" },
    dashboard: { block: "statistics-component-03", priority: "MEDIUM" },
    profile: { block: "form-layout-01", priority: "MEDIUM" },
    assignmentsTable: { block: "datatable-component-01", priority: "MEDIUM" },
  },
  admin: {
    dashboard: { block: "datatable-component-01", priority: "MEDIUM" },
    clientsTable: { block: "datatable-component-04", priority: "MEDIUM" },
    declarationsTable: { block: "datatable-component-01", priority: "MEDIUM" },
    declarationDetail: { block: "dashboard-shell-05", priority: "LOW" },
  },
  shared: {
    emptyState: { block: "empty-state-01", priority: "LOW" },
    errorState: { block: "empty-state-01", priority: "LOW" },
    error404: { block: "error-page-02", priority: "LOW" },
    shellDashboard: { block: "dashboard-shell-05", priority: "MEDIUM" },
    userMenu: { block: "dashboard-dropdown-01", priority: "LOW" },
  },
} as const;
