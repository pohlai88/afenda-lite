export const PLAYGROUND_PAGE_SHAPES = [
  "live",
  "redirect",
  "stub",
  "closed",
  "fixture-gap",
] as const;

export type PlaygroundPageShape = (typeof PLAYGROUND_PAGE_SHAPES)[number];

export type PlaygroundReviewOutcomeKind =
  | "render"
  | "redirect"
  | "redirect-or-not-found"
  | "not-found"
  | "unavailable";

export type PlaygroundReviewActionKind =
  | "review"
  | "verify-redirect"
  | "repair"
  | "blocked";

export type PlaygroundReviewScenario = {
  label: string;
  outcome: PlaygroundReviewOutcomeKind;
  summary: string;
  when?: string;
  destinations?: readonly string[];
};

export type PlaygroundRouteReviewDefinition = {
  shape: Exclude<PlaygroundPageShape, "fixture-gap">;
  purpose: string;
  primary: PlaygroundReviewScenario;
  alternates?: readonly PlaygroundReviewScenario[];
  action: {
    kind: PlaygroundReviewActionKind;
    label: string;
    owner?: string;
  };
  evidence: readonly string[];
};

function rendered(
  purpose: string,
  summary: string,
  evidence: readonly string[],
  alternates?: readonly PlaygroundReviewScenario[],
): PlaygroundRouteReviewDefinition {
  return {
    shape: "live",
    purpose,
    primary: {
      label: "Registered playground URL",
      outcome: "render",
      summary,
    },
    alternates,
    action: { kind: "review", label: "Open Preview and verify the rendered UI." },
    evidence,
  };
}

function redirectEntry(
  purpose: string,
  summary: string,
  destinations: readonly string[],
  evidence: readonly string[],
  alternates?: readonly PlaygroundReviewScenario[],
): PlaygroundRouteReviewDefinition {
  return {
    shape: "redirect",
    purpose,
    primary: {
      label: "Registered playground URL",
      outcome: "redirect",
      summary,
      destinations,
    },
    alternates,
    action: {
      kind: "verify-redirect",
      label: "Open Preview and verify the final URL and landing content.",
    },
    evidence,
  };
}

function redirectOrNotFoundEntry(
  purpose: string,
  summary: string,
  destinations: readonly string[],
  evidence: readonly string[],
): PlaygroundRouteReviewDefinition {
  return {
    shape: "redirect",
    purpose,
    primary: {
      label: "Registered playground URL",
      outcome: "redirect-or-not-found",
      summary,
      destinations,
    },
    action: {
      kind: "verify-redirect",
      label: "Open Preview and record the final URL or not-found result.",
    },
    evidence,
  };
}

function placeholder(
  purpose: string,
  evidence: readonly string[],
  options?: { closed?: boolean; label?: string },
): PlaygroundRouteReviewDefinition {
  const closed = options?.closed ?? false;
  return {
    shape: "stub",
    purpose,
    primary: {
      label: "Registered playground URL",
      outcome: "render",
      summary: options?.label ?? "A placeholder renders instead of product UI.",
    },
    action: closed
      ? {
          kind: "blocked",
          label: "Keep visible for human review; do not rebuild until scope reopens.",
          owner: "Journey phase",
        }
      : {
          kind: "repair",
          label: "Prepare a bounded frontend repair for human approval.",
          owner: "Frontend",
        },
    evidence,
  };
}

function closedTrade(
  purpose: string,
  evidence: readonly string[],
): PlaygroundRouteReviewDefinition {
  return {
    shape: "closed",
    purpose,
    primary: {
      label: "Registered playground URL",
      outcome: "unavailable",
      summary:
        "The Feed Farm Trade phase is closed for this task; runtime output is not product-review evidence.",
    },
    action: {
      kind: "blocked",
      label: "Do not change or verify as product UI until the phase is reopened.",
      owner: "Feed Farm Trade gate register",
    },
    evidence,
  };
}

export const playgroundRouteReviewById = {
  "admin-dashboard": rendered(
    "Operator declaration overview.",
    "The AdminCN operator dashboard renders.",
    ["app/dashboard/page.tsx", "features/organization-admin/organization-admin-dashboard-page.ts"],
  ),
  "admin-clients": rendered(
    "Operator client directory.",
    "The AdminCN clients list renders.",
    ["app/dashboard/clients/page.tsx"],
  ),
  "admin-users-list": rendered(
    "Organization user directory.",
    "The Users list renders with placeholder fixtures until org-member wiring lands.",
    [
      "app/dashboard/users/page.tsx",
      "features/organization-admin/organization-admin-users-page.ts",
    ],
  ),
  "admin-users-view": rendered(
    "Organization user detail.",
    "The User view renders for fixture user-001.",
    [
      "app/dashboard/users/[userId]/page.tsx",
      "features/organization-admin/organization-admin-users-page.ts",
    ],
    [
      {
        label: "Unknown user id",
        outcome: "not-found",
        summary: "An unknown userId returns not found.",
        when: "userId is not in the placeholder fixture set",
      },
    ],
  ),
  "admin-survey-detail": rendered(
    "Operator declaration detail.",
    "The selected declaration detail renders.",
    ["app/dashboard/[id]/page.tsx"],
    [
      {
        label: "Unknown declaration id",
        outcome: "not-found",
        summary: "A configured id with no matching declaration returns not found.",
        when: "PLAYGROUND_SURVEY_ID does not resolve to a declaration",
      },
    ],
  ),
  "client-home-login": rendered(
    "Public landing and sign-in entry.",
    "The Lynx landing renders in playground embed mode.",
    ["app/page.tsx"],
    [
      {
        label: "Authenticated normal navigation",
        outcome: "redirect",
        summary: "An authenticated user is sent to their role landing.",
        destinations: ["/dashboard", "/client", "/client/onboarding"],
      },
      {
        label: "invitationId query",
        outcome: "redirect",
        summary: "An invitation query is normalized to the canonical join entry.",
        when: "invitationId is present",
        destinations: ["/join?invitationId=…"],
      },
    ],
  ),
  "client-named-login": redirectEntry(
    "Named client sign-in entry used by shared links.",
    "Playground embed navigation forwards to Neon sign-in.",
    ["/auth/sign-in?embed=1"],
    ["app/client/(gate)/login/page.tsx", "features/auth/entry/client-sign-in-entry.ts"],
    [
      {
        label: "Authenticated normal navigation",
        outcome: "redirect",
        summary: "An authenticated user is sent to their client or operator landing.",
        destinations: ["/dashboard", "/client", "/client/onboarding"],
      },
    ],
  ),
  "client-org-login": redirectEntry(
    "Canonical operator sign-in entry.",
    "An anonymous request forwards to Neon sign-in with operator context.",
    ["/auth/sign-in?from=org"],
    ["app/org/login/page.tsx", "features/auth/entry/org-sign-in-entry.ts"],
    [
      {
        label: "Authenticated normal navigation",
        outcome: "redirect",
        summary: "An authenticated user is sent to a safe returnTo or role landing.",
        destinations: ["safe returnTo", "/dashboard", "/client", "/client/onboarding"],
      },
    ],
  ),
  "client-auth-admin-legacy": redirectEntry(
    "Legacy alias for the operator sign-in entry.",
    "The legacy alias forwards through the canonical operator sign-in flow.",
    ["/auth/sign-in?from=org"],
    ["app/auth/admin/page.tsx", "features/auth/entry/org-sign-in-entry.ts"],
  ),
  "client-org-access-denied": redirectEntry(
    "Operator sign-in entry with access-denied context.",
    "The request forwards to Neon sign-in and preserves the access-denied reason.",
    ["/auth/sign-in?from=org&reason=access-denied"],
    ["app/org/login/page.tsx", "features/auth/entry/org-sign-in-entry.ts"],
  ),
  "client-dashboard": placeholder(
    "Authenticated client workspace home.",
    ["app/client/(workspace)/page.tsx"],
    { closed: true },
  ),
  "client-onboarding": placeholder(
    "Declarant onboarding and profile setup.",
    ["app/client/(workspace)/onboarding/page.tsx", "doc/frontend/03-routes.md"],
    { closed: true, label: "A bare onboarding placeholder renders; it is not a redirect." },
  ),
  "client-profile": placeholder(
    "Authenticated declarant profile.",
    ["app/client/(workspace)/profile/page.tsx"],
    { closed: true },
  ),
  "client-preview-unavailable": placeholder(
    "Explains why a client preview cannot be shown.",
    ["app/client/(gate)/preview-unavailable/page.tsx"],
    { closed: true },
  ),
  "client-declare": placeholder(
    "Client declaration form for an assignment.",
    ["app/client/(workspace)/declare/[assignmentId]/page.tsx"],
    { closed: true },
  ),
  "auth-sign-in": rendered(
    "Neon credential sign-in.",
    "The Studio sign-in shell and Neon form render in embed mode.",
    ["app/auth/[path]/page.tsx", "features/auth/studio-auth-login-page.tsx"],
  ),
  "account-index": placeholder(
    "Authenticated account settings entry.",
    ["app/account/page.tsx"],
  ),
  "account-security": placeholder(
    "Authenticated password and security settings.",
    ["app/account/[path]/page.tsx"],
  ),
  "not-found": rendered(
    "Portal not-found experience.",
    "The root not-found composition renders.",
    ["app/not-found.tsx"],
  ),
  "dynamic-dashboard-id": rendered(
    "Dynamic operator declaration detail fixture.",
    "The selected declaration detail renders.",
    ["app/dashboard/[id]/page.tsx"],
    [
      {
        label: "Unknown declaration id",
        outcome: "not-found",
        summary: "A configured id with no matching declaration returns not found.",
        when: "PLAYGROUND_SURVEY_ID does not resolve to a declaration",
      },
    ],
  ),
  "dynamic-declare-id": placeholder(
    "Dynamic client declaration assignment fixture.",
    ["app/client/(workspace)/declare/[assignmentId]/page.tsx"],
    { closed: true },
  ),
  "dynamic-auth-sign-up": rendered(
    "Neon account registration.",
    "The Studio shell renders the Neon sign-up view.",
    ["app/auth/[path]/page.tsx"],
  ),
  "dynamic-auth-email-otp": rendered(
    "Neon email one-time-password verification.",
    "The Studio shell renders the email OTP view.",
    ["app/auth/[path]/page.tsx"],
  ),
  "dynamic-auth-forgot-password": rendered(
    "Password recovery request.",
    "The Studio shell renders the forgot-password view.",
    ["app/auth/[path]/page.tsx"],
  ),
  "dynamic-auth-reset-password": redirectEntry(
    "Password reset completion.",
    "Without a valid reset session, the registered URL returns to sign-in.",
    ["/auth/sign-in"],
    ["app/auth/[path]/page.tsx"],
    [
      {
        label: "Valid password reset session",
        outcome: "render",
        summary: "The Studio shell renders the reset-password form.",
        when: "Neon Auth has accepted a valid reset link/session",
      },
    ],
  ),
  "dynamic-auth-magic-link": rendered(
    "Neon magic-link authentication.",
    "The Studio shell renders the magic-link view.",
    ["app/auth/[path]/page.tsx"],
  ),
  "dynamic-auth-accept-invitation": redirectEntry(
    "Neon invitation acceptance compatibility entry.",
    "Without invitationId, an anonymous request is sent to sign-in with this route as redirectTo.",
    ["/auth/sign-in?redirectTo=/auth/accept-invitation"],
    ["app/auth/[path]/page.tsx", "features/auth/entry/client-invitation-entry.ts"],
    [
      {
        label: "invitationId query",
        outcome: "redirect",
        summary: "The compatibility entry forwards to the canonical join URL.",
        when: "invitationId is non-empty",
        destinations: ["/join?invitationId=…"],
      },
    ],
  ),
  "dynamic-auth-sign-out": redirectEntry(
    "Neon sign-out view.",
    "The route completes or confirms sign-out and returns to sign-in.",
    ["/auth/sign-in"],
    ["app/auth/[path]/page.tsx"],
  ),
  "dynamic-account-settings": placeholder(
    "Dynamic Neon account settings view.",
    ["app/account/[path]/page.tsx"],
  ),
  "dynamic-account-security": placeholder(
    "Dynamic Neon account security view.",
    ["app/account/[path]/page.tsx"],
  ),
  "dynamic-public-survey-slug": redirectOrNotFoundEntry(
    "Public declaration link resolved by survey slug.",
    "A valid slug redirects to sign-in or the assigned declaration; a missing survey returns not found.",
    ["/auth/sign-in?returnTo=…", "/client/declare/…"],
    ["app/survey/[slug]/page.tsx", "features/auth/entry/open-link-entry.ts"],
  ),
  "dynamic-public-secure-token": redirectOrNotFoundEntry(
    "Secure declaration link resolved by invite token.",
    "A valid token redirects to sign-in or the assigned declaration; a missing survey returns not found.",
    ["/auth/sign-in?returnTo=…", "/client/declare/…"],
    ["app/f/[token]/page.tsx", "features/auth/entry/secure-link-entry.ts"],
  ),
  "dynamic-legacy-invite-token": redirectEntry(
    "Legacy client invitation compatibility URL.",
    "The token state is converted to a sign-in notice or authenticated landing.",
    ["/auth/sign-in?reason=…", "/dashboard", "/client", "/client/onboarding"],
    ["app/invite/[token]/page.tsx", "features/auth/entry/legacy-invite-entry.ts"],
  ),
  "dynamic-client-join": placeholder(
    "Canonical Neon organization invitation entry.",
    ["app/join/page.tsx", "features/auth/entry/client-invitation-entry.ts", "doc/frontend/10-join-phase2-tasks.md"],
    {
      label:
        "A bare join placeholder renders; the existing Studio invitation runner is not wired.",
    },
  ),
  "fft-trade-index": closedTrade("Feed Farm Trade locale entry.", [
    "app/fft/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-events": closedTrade("Feed Farm Trade event catalogue.", [
    "app/fft/events/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-my-orders": closedTrade("Feed Farm Trade buyer order history.", [
    "app/fft/my-orders/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-event-order": closedTrade("Feed Farm Trade event order flow.", [
    "app/fft/events/[eventId]/order/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-events": closedTrade("Feed Farm Trade event administration.", [
    "app/fft/admin/events/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-events-new": closedTrade("Feed Farm Trade event creation.", [
    "app/fft/admin/events/new/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-event-setup": closedTrade("Feed Farm Trade event setup.", [
    "app/fft/admin/events/[eventId]/setup/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-event-allocation": closedTrade("Feed Farm Trade allocation operations.", [
    "app/fft/admin/events/[eventId]/allocation/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-event-deposits": closedTrade("Feed Farm Trade deposit operations.", [
    "app/fft/admin/events/[eventId]/deposits/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-event-imports": closedTrade("Feed Farm Trade import operations.", [
    "app/fft/admin/events/[eventId]/imports/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-event-pickup": closedTrade("Feed Farm Trade pickup operations.", [
    "app/fft/admin/events/[eventId]/pickup/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-erp-sync": closedTrade("Feed Farm Trade ERP synchronization.", [
    "app/fft/admin/erp-sync/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
  "fft-admin-rbac": closedTrade("Feed Farm Trade role and access administration.", [
    "app/fft/admin/rbac/page.tsx",
    "doc/frontend/adr/001-feed-farm-trade.md",
  ]),
} as const satisfies Record<string, PlaygroundRouteReviewDefinition>;

export type PlaygroundRouteReviewId = keyof typeof playgroundRouteReviewById;

export function getPlaygroundRouteReview(
  screenId: string,
): PlaygroundRouteReviewDefinition | null {
  return screenId in playgroundRouteReviewById
    ? playgroundRouteReviewById[screenId as PlaygroundRouteReviewId]
    : null;
}
