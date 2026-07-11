/**
 * Single source of truth for playground screen bindings.
 * Imported by lib/playground.ts, check scripts, and E2E helpers.
 */

import { SANDBOX_INVITE_TOKEN, SANDBOX_SURVEY_SLUG } from "@/modules/identity/production-fixtures";

export type PlaygroundScreenCategory =
  | "admin"
  | "client"
  | "dynamic"
  | "hot-sales"
  | "auto";

export type PlaygroundScreenDef = {
  id: string;
  category: PlaygroundScreenCategory;
  label: string;
  /** Path template — may include {PLAYGROUND_SURVEY_ID}, etc. */
  path: string;
  /** App router page when the preview hits a dynamic segment route. */
  routeFile?: string;
};

/** Static map from resolved path patterns to app router page files. */
export const playgroundRouteFiles: Record<string, string> = {
  "/dashboard": "app/dashboard/page.tsx",
  "/dashboard/clients": "app/dashboard/clients/page.tsx",
  "/dashboard/{id}": "app/dashboard/[id]/page.tsx",
  "/": "app/page.tsx",
  "/org/login": "app/org/login/page.tsx",
  "/auth/admin": "app/auth/admin/page.tsx",
  "/client/login": "app/client/(gate)/login/page.tsx",
  "/client": "app/client/(workspace)/page.tsx",
  "/client/onboarding": "app/client/(workspace)/onboarding/page.tsx",
  "/client/profile": "app/client/(workspace)/profile/page.tsx",
  "/client/declare/{id}":
    "app/client/(workspace)/declare/[assignmentId]/page.tsx",
  "/client/preview-unavailable": "app/client/(gate)/preview-unavailable/page.tsx",
  "/auth/sign-in": "app/auth/[path]/page.tsx",
  "/auth/{path}": "app/auth/[path]/page.tsx",
  "/account": "app/account/page.tsx",
  "/account/security": "app/account/[path]/page.tsx",
  "/account/{path}": "app/account/[path]/page.tsx",
  "/survey/{slug}": "app/survey/[slug]/page.tsx",
  "/f/{token}": "app/f/[token]/page.tsx",
  "/invite/{token}": "app/invite/[token]/page.tsx",
  "/join": "app/join/page.tsx",
  "/playground-404-preview": "app/not-found.tsx",
  "/trade": "app/trade/page.tsx",
  "/trade/events": "app/trade/events/page.tsx",
  "/trade/my-orders": "app/trade/my-orders/page.tsx",
  "/trade/events/{id}/order": "app/trade/events/[eventId]/order/page.tsx",
  "/trade/admin/events": "app/trade/admin/events/page.tsx",
  "/trade/admin/events/new": "app/trade/admin/events/new/page.tsx",
  "/trade/admin/events/{id}/setup":
    "app/trade/admin/events/[eventId]/setup/page.tsx",
  "/trade/admin/events/{id}/allocation":
    "app/trade/admin/events/[eventId]/allocation/page.tsx",
  "/trade/admin/events/{id}/deposits":
    "app/trade/admin/events/[eventId]/deposits/page.tsx",
  "/trade/admin/events/{id}/imports":
    "app/trade/admin/events/[eventId]/imports/page.tsx",
  "/trade/admin/events/{id}/pickup":
    "app/trade/admin/events/[eventId]/pickup/page.tsx",
  "/trade/admin/erp-sync": "app/trade/admin/erp-sync/page.tsx",
  "/trade/admin/rbac": "app/trade/admin/rbac/page.tsx",
};

/** Flat `app/client/*` pages conflict with `(workspace)` / `(gate)` route groups. */
/** Flat page/layout files under `app/client/` that duplicate `(workspace)` / `(gate)` routes. */
export const legacyFlatClientRouteFiles = [
  "app/client/page.tsx",
  "app/client/layout.tsx",
  "app/client/loading.tsx",
  "app/client/onboarding/page.tsx",
  "app/client/profile/page.tsx",
  "app/client/profile/loading.tsx",
  "app/client/declare/[id]/page.tsx",
  "app/client/declare/[id]/loading.tsx",
  "app/client/login/page.tsx",
  "app/client/preview-unavailable/page.tsx",
] as const;

export const playgroundScreenDefs: PlaygroundScreenDef[] = [
  {
    id: "admin-dashboard",
    category: "admin",
    label: "Dashboard",
    path: "/dashboard",
  },
  {
    id: "admin-clients",
    category: "admin",
    label: "Clients",
    path: "/dashboard/clients",
  },
  {
    id: "admin-survey-detail",
    category: "admin",
    label: "Survey detail",
    path: "/dashboard/{PLAYGROUND_SURVEY_ID}",
  },
  {
    id: "client-home-login",
    category: "client",
    label: "Lynx pixel landing",
    path: "/",
  },
  {
    id: "client-named-login",
    category: "client",
    label: "Client login entry",
    path: "/client/login",
  },
  {
    id: "client-org-login",
    category: "client",
    label: "Org login",
    path: "/org/login",
  },
  {
    id: "client-auth-admin-legacy",
    category: "client",
    label: "Auth admin legacy alias",
    path: "/auth/admin",
  },
  {
    id: "client-org-access-denied",
    category: "client",
    label: "Org access denied",
    path: "/org/login?reason=access-denied",
  },
  {
    id: "client-dashboard",
    category: "client",
    label: "Client dashboard (unavailable stub)",
    path: "/client",
  },
  {
    id: "client-onboarding",
    category: "client",
    label: "Client onboarding",
    path: "/client/onboarding",
  },
  {
    id: "client-profile",
    category: "client",
    label: "Declarant profile (unavailable stub)",
    path: "/client/profile",
  },
  {
    id: "client-preview-unavailable",
    category: "client",
    label: "Preview unavailable",
    path: "/client/preview-unavailable",
  },
  {
    id: "client-declare",
    category: "client",
    label: "Declaration form (unavailable stub)",
    path: "/client/declare/{PLAYGROUND_ASSIGNMENT_ID}",
  },
  {
    id: "auth-sign-in",
    category: "client",
    label: "Sign in",
    path: "/auth/sign-in",
    routeFile: "app/auth/[path]/page.tsx",
  },
  {
    id: "account-index",
    category: "client",
    label: "Account index",
    path: "/account",
    routeFile: "app/account/page.tsx",
  },
  {
    id: "account-security",
    category: "client",
    label: "Account security",
    path: "/account/security",
    routeFile: "app/account/[path]/page.tsx",
  },
  {
    id: "not-found",
    category: "client",
    label: "404 not found",
    path: "/playground-404-preview",
  },
  // ── Dynamic routes (multiplexed `[path]` / `[id]` / `[token]` pages) ───────
  {
    id: "dynamic-dashboard-id",
    category: "dynamic",
    label: "Dashboard [id]",
    path: "/dashboard/{PLAYGROUND_SURVEY_ID}",
    routeFile: "app/dashboard/[id]/page.tsx",
  },
  {
    id: "dynamic-declare-id",
    category: "dynamic",
    label: "Declare [id]",
    path: "/client/declare/{PLAYGROUND_ASSIGNMENT_ID}",
    routeFile: "app/client/(workspace)/declare/[assignmentId]/page.tsx",
  },
  {
    id: "dynamic-auth-sign-up",
    category: "dynamic",
    label: "Auth [path] · sign-up",
    path: "/auth/sign-up",
    routeFile: "app/auth/[path]/page.tsx",
  },
  {
    id: "dynamic-auth-email-otp",
    category: "dynamic",
    label: "Auth [path] · email OTP",
    path: "/auth/email-otp",
    routeFile: "app/auth/[path]/page.tsx",
  },
  {
    id: "dynamic-auth-forgot-password",
    category: "dynamic",
    label: "Auth [path] · forgot password",
    path: "/auth/forgot-password",
    routeFile: "app/auth/[path]/page.tsx",
  },
  {
    id: "dynamic-auth-reset-password",
    category: "dynamic",
    label: "Auth [path] · reset password",
    path: "/auth/reset-password",
    routeFile: "app/auth/[path]/page.tsx",
  },
  {
    id: "dynamic-auth-magic-link",
    category: "dynamic",
    label: "Auth [path] · magic link",
    path: "/auth/magic-link",
    routeFile: "app/auth/[path]/page.tsx",
  },
  {
    id: "dynamic-auth-accept-invitation",
    category: "dynamic",
    label: "Auth [path] · accept invitation",
    path: "/auth/accept-invitation",
    routeFile: "app/auth/[path]/page.tsx",
  },
  {
    id: "dynamic-auth-sign-out",
    category: "dynamic",
    label: "Auth [path] · sign-out",
    path: "/auth/sign-out",
    routeFile: "app/auth/[path]/page.tsx",
  },
  {
    id: "dynamic-account-settings",
    category: "dynamic",
    label: "Account [path] · settings",
    path: "/account/settings",
    routeFile: "app/account/[path]/page.tsx",
  },
  {
    id: "dynamic-account-security",
    category: "dynamic",
    label: "Account [path] · security",
    path: "/account/security",
    routeFile: "app/account/[path]/page.tsx",
  },
  {
    id: "dynamic-public-survey-slug",
    category: "dynamic",
    label: "Survey [slug]",
    path: "/survey/{PLAYGROUND_SURVEY_SLUG}",
    routeFile: "app/survey/[slug]/page.tsx",
  },
  {
    id: "dynamic-public-secure-token",
    category: "dynamic",
    label: "Secure link [token]",
    path: "/f/{PLAYGROUND_SECURE_LINK_TOKEN}",
    routeFile: "app/f/[token]/page.tsx",
  },
  {
    id: "dynamic-legacy-invite-token",
    category: "dynamic",
    label: "Legacy invite [token]",
    path: "/invite/{PLAYGROUND_LEGACY_INVITE_TOKEN}",
    routeFile: "app/invite/[token]/page.tsx",
  },
  {
    id: "dynamic-client-join",
    category: "dynamic",
    label: "Join (invitation entry)",
    path: "/join",
    routeFile: "app/join/page.tsx",
  },
  // ── Hot Sales (`/trade/*`) ─────────────────────────────────────────────────
  // Phase closed for HITL. Current route pages are holding stubs and do not
  // prove requireTradeAccess() redirect behavior. Do not infer or change RBAC
  // from these fixtures; use the Hot Sales gate register when scope reopens.
  {
    id: "hot-sales-trade-index",
    category: "hot-sales",
    label: "Trade index",
    path: "/trade",
    routeFile: "app/trade/page.tsx",
  },
  {
    id: "hot-sales-events",
    category: "hot-sales",
    label: "Trade events",
    path: "/trade/events",
    routeFile: "app/trade/events/page.tsx",
  },
  {
    id: "hot-sales-my-orders",
    category: "hot-sales",
    label: "My orders",
    path: "/trade/my-orders",
    routeFile: "app/trade/my-orders/page.tsx",
  },
  {
    id: "hot-sales-event-order",
    category: "hot-sales",
    label: "Event order",
    path: "/trade/events/{PLAYGROUND_HOT_SALES_EVENT_ID}/order",
    routeFile: "app/trade/events/[eventId]/order/page.tsx",
  },
  {
    id: "hot-sales-admin-events",
    category: "hot-sales",
    label: "Admin events",
    path: "/trade/admin/events",
    routeFile: "app/trade/admin/events/page.tsx",
  },
  {
    id: "hot-sales-admin-events-new",
    category: "hot-sales",
    label: "Admin events · new",
    path: "/trade/admin/events/new",
    routeFile: "app/trade/admin/events/new/page.tsx",
  },
  {
    id: "hot-sales-admin-event-setup",
    category: "hot-sales",
    label: "Admin event · setup",
    path: "/trade/admin/events/{PLAYGROUND_HOT_SALES_EVENT_ID}/setup",
    routeFile: "app/trade/admin/events/[eventId]/setup/page.tsx",
  },
  {
    id: "hot-sales-admin-event-allocation",
    category: "hot-sales",
    label: "Admin event · allocation",
    path: "/trade/admin/events/{PLAYGROUND_HOT_SALES_EVENT_ID}/allocation",
    routeFile: "app/trade/admin/events/[eventId]/allocation/page.tsx",
  },
  {
    id: "hot-sales-admin-event-deposits",
    category: "hot-sales",
    label: "Admin event · deposits",
    path: "/trade/admin/events/{PLAYGROUND_HOT_SALES_EVENT_ID}/deposits",
    routeFile: "app/trade/admin/events/[eventId]/deposits/page.tsx",
  },
  {
    id: "hot-sales-admin-event-imports",
    category: "hot-sales",
    label: "Admin event · imports",
    path: "/trade/admin/events/{PLAYGROUND_HOT_SALES_EVENT_ID}/imports",
    routeFile: "app/trade/admin/events/[eventId]/imports/page.tsx",
  },
  {
    id: "hot-sales-admin-event-pickup",
    category: "hot-sales",
    label: "Admin event · pickup",
    path: "/trade/admin/events/{PLAYGROUND_HOT_SALES_EVENT_ID}/pickup",
    routeFile: "app/trade/admin/events/[eventId]/pickup/page.tsx",
  },
  {
    id: "hot-sales-admin-erp-sync",
    category: "hot-sales",
    label: "Admin ERP sync",
    path: "/trade/admin/erp-sync",
    routeFile: "app/trade/admin/erp-sync/page.tsx",
  },
  {
    id: "hot-sales-admin-rbac",
    category: "hot-sales",
    label: "Admin RBAC",
    path: "/trade/admin/rbac",
    routeFile: "app/trade/admin/rbac/page.tsx",
  },
];

export function playgroundEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function resolvePlaygroundPathTemplate(template: string) {
  return template
    .replace("{PLAYGROUND_SURVEY_ID}", playgroundEnv("PLAYGROUND_SURVEY_ID"))
    .replace(
      "{PLAYGROUND_ASSIGNMENT_ID}",
      playgroundEnv("PLAYGROUND_ASSIGNMENT_ID"),
    )
    .replace(
      "{PLAYGROUND_SURVEY_SLUG}",
      playgroundEnv("PLAYGROUND_SURVEY_SLUG") || SANDBOX_SURVEY_SLUG,
    )
    .replace(
      "{PLAYGROUND_SECURE_LINK_TOKEN}",
      playgroundEnv("PLAYGROUND_SECURE_LINK_TOKEN") || SANDBOX_INVITE_TOKEN,
    )
    .replace(
      "{PLAYGROUND_LEGACY_INVITE_TOKEN}",
      playgroundEnv("PLAYGROUND_LEGACY_INVITE_TOKEN") || "invalid-preview-token",
    )
    .replace(
      "{PLAYGROUND_HOT_SALES_EVENT_ID}",
      playgroundEnv("PLAYGROUND_HOT_SALES_EVENT_ID"),
    );
}

export function resolvePlaygroundRouteFile(pathOrTemplate: string) {
  if (pathOrTemplate.includes("{PLAYGROUND_SURVEY_ID}")) {
    return playgroundRouteFiles["/dashboard/{id}"];
  }

  if (pathOrTemplate.includes("{PLAYGROUND_ASSIGNMENT_ID}")) {
    return playgroundRouteFiles["/client/declare/{id}"];
  }

  if (pathOrTemplate.includes("{PLAYGROUND_HOT_SALES_EVENT_ID}")) {
    if (pathOrTemplate.includes("/order")) {
      return playgroundRouteFiles["/trade/events/{id}/order"];
    }
    if (pathOrTemplate.includes("/setup")) {
      return playgroundRouteFiles["/trade/admin/events/{id}/setup"];
    }
    if (pathOrTemplate.includes("/allocation")) {
      return playgroundRouteFiles["/trade/admin/events/{id}/allocation"];
    }
    if (pathOrTemplate.includes("/deposits")) {
      return playgroundRouteFiles["/trade/admin/events/{id}/deposits"];
    }
    if (pathOrTemplate.includes("/imports")) {
      return playgroundRouteFiles["/trade/admin/events/{id}/imports"];
    }
    if (pathOrTemplate.includes("/pickup")) {
      return playgroundRouteFiles["/trade/admin/events/{id}/pickup"];
    }
  }

  const [pathname] = pathOrTemplate.split("?");

  if (playgroundRouteFiles[pathname]) {
    return playgroundRouteFiles[pathname];
  }

  if (/^\/dashboard\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/dashboard/{id}"];
  }

  if (/^\/client\/declare\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/client/declare/{id}"];
  }

  if (/^\/auth\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/auth/{path}"];
  }

  if (/^\/account\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/account/{path}"];
  }

  if (/^\/survey\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/survey/{slug}"];
  }

  if (/^\/f\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/f/{token}"];
  }

  if (/^\/invite\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/invite/{token}"];
  }

  if (pathname === "/join") {
    return playgroundRouteFiles["/join"];
  }

  if (pathname === "/account") {
    return playgroundRouteFiles["/account"];
  }

  if (pathname === "/trade") {
    return playgroundRouteFiles["/trade"];
  }

  if (pathname === "/trade/events") {
    return playgroundRouteFiles["/trade/events"];
  }

  if (pathname === "/trade/my-orders") {
    return playgroundRouteFiles["/trade/my-orders"];
  }

  if (/^\/trade\/events\/[^/]+\/order$/.test(pathname)) {
    return playgroundRouteFiles["/trade/events/{id}/order"];
  }

  if (pathname === "/trade/admin/events") {
    return playgroundRouteFiles["/trade/admin/events"];
  }

  if (pathname === "/trade/admin/events/new") {
    return playgroundRouteFiles["/trade/admin/events/new"];
  }

  if (/^\/trade\/admin\/events\/[^/]+\/setup$/.test(pathname)) {
    return playgroundRouteFiles["/trade/admin/events/{id}/setup"];
  }

  if (/^\/trade\/admin\/events\/[^/]+\/allocation$/.test(pathname)) {
    return playgroundRouteFiles["/trade/admin/events/{id}/allocation"];
  }

  if (/^\/trade\/admin\/events\/[^/]+\/deposits$/.test(pathname)) {
    return playgroundRouteFiles["/trade/admin/events/{id}/deposits"];
  }

  if (/^\/trade\/admin\/events\/[^/]+\/imports$/.test(pathname)) {
    return playgroundRouteFiles["/trade/admin/events/{id}/imports"];
  }

  if (/^\/trade\/admin\/events\/[^/]+\/pickup$/.test(pathname)) {
    return playgroundRouteFiles["/trade/admin/events/{id}/pickup"];
  }

  if (pathname === "/trade/admin/erp-sync") {
    return playgroundRouteFiles["/trade/admin/erp-sync"];
  }

  if (pathname === "/trade/admin/rbac") {
    return playgroundRouteFiles["/trade/admin/rbac"];
  }

  return null;
}

export function isPlaygroundScreenPathConfigured(path: string) {
  if (!path || path.includes("{PLAYGROUND_")) {
    return false;
  }

  const [pathname] = path.split("?");
  if (pathname.endsWith("/") && pathname !== "/") {
    return false;
  }

  // Empty fixture substitution leaves `//` (e.g. missing event id).
  if (pathname.includes("//")) {
    return false;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.some((segment) => segment.length === 0)) {
    return false;
  }

  return true;
}

export function buildPlaygroundEmbedUrl(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}embed=1`;
}
