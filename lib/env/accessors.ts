import type { ServerEnv } from "@/lib/env/schema";
import { getServerEnv } from "@/lib/env/server";

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

export function isGuardianAuthShellEnabled(
  env: Pick<ServerEnv, "GUARDIAN_AUTH_SHELL"> = getServerEnv(),
) {
  const raw = env.GUARDIAN_AUTH_SHELL?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  return true;
}

/** Hot Sales Phase 2A RBAC cutover. Default off = Phase 1 Admin + allowlist. */
export function isHotSalesRbacEnabled(
  env: Pick<ServerEnv, "HOT_SALES_RBAC_ENABLED"> = getServerEnv(),
) {
  return env.HOT_SALES_RBAC_ENABLED === "true";
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
