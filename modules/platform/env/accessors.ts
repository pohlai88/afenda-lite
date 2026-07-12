import type { ServerEnv } from "@/modules/platform/env/schema";
import { getServerEnv } from "@/modules/platform/env/server";

const LOCAL_DEV_APP_URL = "http://localhost:3000";

export function resolveAppBaseUrl(
  env: Pick<ServerEnv, "APP_URL" | "VERCEL_URL">,
) {
  if (env.APP_URL) {
    return env.APP_URL.replace(/\/$/, "");
  }

  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return LOCAL_DEV_APP_URL;
}

export function getAppBaseUrl() {
  return resolveAppBaseUrl(getServerEnv());
}

export function getClientSignInUrl() {
  return `${getAppBaseUrl()}/client/login`;
}

export function getClientJoinUrl(invitationId?: string) {
  const base = `${getAppBaseUrl()}/join`;
  if (!invitationId?.trim()) {
    return base;
  }

  return `${base}?invitationId=${encodeURIComponent(invitationId.trim())}`;
}

export function isPlaygroundEnabled(
  env: Pick<ServerEnv, "PLAYGROUND_ENABLED"> = getServerEnv(),
) {
  return env.PLAYGROUND_ENABLED === "true";
}

/** M1 org switcher chrome — default off until multi-org operators need it. */
export function isPortalOrgSwitcherEnabled(
  env: Pick<ServerEnv, "PORTAL_ORG_SWITCHER_ENABLED"> = getServerEnv(),
) {
  return env.PORTAL_ORG_SWITCHER_ENABLED === "true";
}

export function isGuardianAuthShellEnabled(
  env: Pick<ServerEnv, "GUARDIAN_AUTH_SHELL"> = getServerEnv(),
) {
  const raw = env.GUARDIAN_AUTH_SHELL?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  return true;
}

/** Feed Farm Trade Phase 2A RBAC cutover. Default off = Phase 1 Admin + allowlist. */
export function isFftRbacEnabled(
  env: Pick<ServerEnv, "FFT_RBAC_ENABLED"> = getServerEnv(),
) {
  return env.FFT_RBAC_ENABLED === "true";
}

/** Feed Farm Trade Phase 2B operational deposit records (ADR-002). */
export function isFftDepositEnabled(
  env: Pick<ServerEnv, "FFT_DEPOSIT_ENABLED"> = getServerEnv(),
) {
  return env.FFT_DEPOSIT_ENABLED === "true";
}

/** Feed Farm Trade Phase 2B pickup/ops workflow (ADR-002). */
export function isFftPickupOpsEnabled(
  env: Pick<ServerEnv, "FFT_PICKUP_OPS_ENABLED"> = getServerEnv(),
) {
  return env.FFT_PICKUP_OPS_ENABLED === "true";
}

/** Feed Farm Trade Phase 2C outbound notifications (ADR-003). Default off until prod checklist. */
export function isFftNotificationsEnabled(
  env: Pick<ServerEnv, "FFT_NOTIFICATIONS_ENABLED"> = getServerEnv(),
) {
  return env.FFT_NOTIFICATIONS_ENABLED === "true";
}

export function getFftEmailFrom(
  env: Pick<ServerEnv, "FFT_EMAIL_FROM"> = getServerEnv(),
) {
  return env.FFT_EMAIL_FROM?.trim() ?? "";
}

/** Feed Farm Trade Phase 2D ERP sync (ADR-004). Default off until integration checklist. */
export function isFftErpSyncEnabled(
  env: Pick<ServerEnv, "FFT_ERP_SYNC_ENABLED"> = getServerEnv(),
) {
  return env.FFT_ERP_SYNC_ENABLED === "true";
}

export function getFftErpVendor(
  env: Pick<ServerEnv, "FFT_ERP_VENDOR"> = getServerEnv(),
) {
  return env.FFT_ERP_VENDOR?.trim().toLowerCase() ?? "";
}

export function getFftErpBaseUrl(
  env: Pick<ServerEnv, "FFT_ERP_BASE_URL"> = getServerEnv(),
) {
  return env.FFT_ERP_BASE_URL?.trim() ?? "";
}

export function getFftErpApiKey(): string {
  return process.env.FFT_ERP_API_KEY?.trim() ?? "";
}

export function getResendApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() ?? "";
}

export function getSharedAdminEmail(
  env: Pick<ServerEnv, "SHARED_ADMIN_EMAIL"> = getServerEnv(),
) {
  return env.SHARED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export function getPreviewClientEmail(
  env: Pick<ServerEnv, "PREVIEW_CLIENT_EMAIL"> = getServerEnv(),
) {
  return env.PREVIEW_CLIENT_EMAIL?.trim().toLowerCase() ?? "";
}

export function getPreviewClientPassword(
  env: Pick<ServerEnv, "PREVIEW_CLIENT_PASSWORD"> = getServerEnv(),
) {
  return env.PREVIEW_CLIENT_PASSWORD ?? "";
}

export function getPreviewClientName(
  env: Pick<ServerEnv, "PREVIEW_CLIENT_NAME"> = getServerEnv(),
) {
  return env.PREVIEW_CLIENT_NAME?.trim() || "Preview Client";
}

export function isPreviewClientConfigured(
  env: Pick<ServerEnv, "PREVIEW_CLIENT_EMAIL" | "PREVIEW_CLIENT_PASSWORD"> = getServerEnv(),
) {
  return (
    getPreviewClientEmail(env).length > 0 &&
    getPreviewClientPassword(env).length > 0
  );
}
