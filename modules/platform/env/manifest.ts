/**
 * Single source of truth for env var metadata (runtime schema + compose/sync policy).
 * Zod shape: lib/env/build-schema.ts · Script policy: scripts/lib/env-manifest.generated.mjs
 */

export type EnvVarKind =
  | "requiredString"
  | "requiredUrl"
  | "requiredMinPassword"
  | "requiredMinCookieSecret"
  | "optionalString"
  | "optionalEmail"
  | "optionalEmailFrom"
  | "optionalUrl"
  | "optionalUuid"
  | "optionalBooleanFlag";

export type EnvVarDef = {
  key: string;
  kind: EnvVarKind;
  /** Stored in env.secret (compose/split). */
  secret?: boolean;
  /** Synced to Vercel production via npm run sync:vercel */
  vercelProduction?: boolean;
  /**
   * Tenant / customer deployment configures when enabling the feature.
   * Still in the Vercel sync allowlist (pushed only when set), but not required
   * for validate:env-sync / audit:vercel green.
   */
  syncOptional?: boolean;
  /** Local dev / tooling — never sync to Vercel production. */
  localOnly?: boolean;
  /** Obsolete — remove from Vercel via npm run cleanup:vercel */
  stale?: boolean;
  /** Validated by lib/env/server.ts at Node startup. Default false for script-only keys. */
  runtime?: boolean;
};

export const ENV_VAR_MANIFEST = [
  // —— Runtime (Next.js server) ——
  {
    key: "DATABASE_URL",
    kind: "requiredString",
    runtime: true,
    secret: true,
    vercelProduction: true,
  },
  {
    key: "APP_URL",
    kind: "optionalUrl",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "VERCEL_URL",
    kind: "optionalString",
    runtime: true,
  },
  {
    key: "SHARED_ADMIN_EMAIL",
    kind: "optionalEmail",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "SHARED_ADMIN_PASSWORD",
    kind: "optionalString",
    runtime: true,
    secret: true,
    vercelProduction: true,
  },
  {
    key: "SHARED_ADMIN_NAME",
    kind: "optionalString",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "PREVIEW_CLIENT_EMAIL",
    kind: "optionalEmail",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "PREVIEW_CLIENT_PASSWORD",
    kind: "optionalString",
    runtime: true,
    secret: true,
    vercelProduction: true,
  },
  {
    key: "PREVIEW_CLIENT_NAME",
    kind: "optionalString",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "CLIENT_DEFAULT_PASSWORD",
    kind: "requiredMinPassword",
    runtime: true,
    secret: true,
    vercelProduction: true,
  },
  {
    key: "NEON_AUTH_BASE_URL",
    kind: "requiredUrl",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "NEON_AUTH_COOKIE_SECRET",
    kind: "requiredMinCookieSecret",
    runtime: true,
    secret: true,
    vercelProduction: true,
  },
  {
    key: "GUARDIAN_AUTH_SHELL",
    kind: "optionalBooleanFlag",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "FFT_RBAC_ENABLED",
    kind: "optionalBooleanFlag",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "FFT_DEPOSIT_ENABLED",
    kind: "optionalBooleanFlag",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "FFT_PICKUP_OPS_ENABLED",
    kind: "optionalBooleanFlag",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "FFT_NOTIFICATIONS_ENABLED",
    kind: "optionalBooleanFlag",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "FFT_EMAIL_FROM",
    kind: "optionalEmailFrom",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "RESEND_API_KEY",
    kind: "optionalString",
    localOnly: true,
    secret: true,
  },
  {
    key: "FFT_ERP_SYNC_ENABLED",
    kind: "optionalBooleanFlag",
    runtime: true,
    vercelProduction: true,
  },
  {
    key: "FFT_ERP_VENDOR",
    kind: "optionalString",
    runtime: true,
    syncOptional: true,
    vercelProduction: true,
  },
  {
    key: "FFT_ERP_BASE_URL",
    kind: "optionalString",
    runtime: true,
    syncOptional: true,
    vercelProduction: true,
  },
  {
    key: "FFT_ERP_API_KEY",
    kind: "optionalString",
    localOnly: true,
    secret: true,
  },
  {
    key: "PORTAL_ORG_SLUG",
    kind: "optionalString",
    runtime: true,
  },
  {
    key: "PORTAL_ORG_NAME",
    kind: "optionalString",
    runtime: true,
  },
  {
    key: "PORTAL_ORG_SWITCHER_ENABLED",
    kind: "optionalBooleanFlag",
    runtime: true,
  },
  {
    key: "PORTAL_ORGANIZATION_ID",
    kind: "optionalUuid",
    localOnly: true,
  },
  {
    key: "E2E_ORGANIZATION_ID",
    kind: "optionalUuid",
    localOnly: true,
  },
  {
    key: "PLAYGROUND_ENABLED",
    kind: "optionalBooleanFlag",
    localOnly: true,
    runtime: true,
  },
  {
    key: "PLAYGROUND_SURVEY_ID",
    kind: "optionalUuid",
    localOnly: true,
    runtime: true,
  },
  {
    key: "PLAYGROUND_ASSIGNMENT_ID",
    kind: "optionalUuid",
    localOnly: true,
    runtime: true,
  },
  {
    key: "PLAYGROUND_SURVEY_SLUG",
    kind: "optionalString",
    localOnly: true,
    runtime: true,
  },
  {
    key: "PLAYGROUND_FFT_EVENT_ID",
    kind: "optionalUuid",
    localOnly: true,
    runtime: true,
  },
  {
    key: "PLAYGROUND_FFT_LOCALE",
    kind: "optionalString",
    localOnly: true,
    runtime: true,
  },

  // —— Script / tooling only (not in serverEnvSchema) ——
  {
    key: "NEON_API_KEY",
    kind: "optionalString",
    localOnly: true,
    secret: true,
  },
  { key: "NEON_ORG_ID", kind: "optionalString", localOnly: true },
  { key: "NEON_PROJECT_ID", kind: "optionalString", localOnly: true },
  { key: "NEON_BRANCH_ID", kind: "optionalString", localOnly: true },
  {
    key: "SHADCN_STUDIO_API_KEY",
    kind: "optionalString",
    localOnly: true,
    secret: true,
  },
  { key: "SHADCN_STUDIO_EMAIL", kind: "optionalString", localOnly: true },
  { key: "LICENSE_KEY", kind: "optionalString", localOnly: true, secret: true },
  { key: "EMAIL", kind: "optionalString", localOnly: true },

  // —— Stale (cleanup only) ——
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    kind: "optionalString",
    stale: true,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    kind: "optionalString",
    stale: true,
  },
  { key: "SUPABASE_SERVICE_ROLE_KEY", kind: "optionalString", stale: true },
  { key: "SMTP_HOST", kind: "optionalString", stale: true },
  { key: "SMTP_PORT", kind: "optionalString", stale: true },
  { key: "SMTP_USER", kind: "optionalString", stale: true },
  { key: "SMTP_FROM_EMAIL", kind: "optionalString", stale: true },
  { key: "SMTP_FROM_NAME", kind: "optionalString", stale: true },
  { key: "MAILERSEND_API_KEY", kind: "optionalString", stale: true },
  { key: "MAILERSEND_FROM_EMAIL", kind: "optionalString", stale: true },
  { key: "MAILERSEND_FROM_NAME", kind: "optionalString", stale: true },
] as const satisfies readonly EnvVarDef[];

type InferEnvValue<K extends EnvVarKind> = K extends
  | "requiredString"
  | "requiredUrl"
  | "requiredMinPassword"
  | "requiredMinCookieSecret"
  ? string
  : K extends
        | "optionalString"
        | "optionalEmail"
        | "optionalEmailFrom"
        | "optionalUrl"
        | "optionalUuid"
        | "optionalBooleanFlag"
    ? string | undefined
    : never;

type RuntimeManifestEntry = Extract<
  (typeof ENV_VAR_MANIFEST)[number],
  { runtime: true }
>;

/** Parsed server env bag (matches serverEnvSchema). */
export type ServerEnv = {
  [Entry in RuntimeManifestEntry as Entry["key"]]: InferEnvValue<Entry["kind"]>;
};

export type ManifestEnvKey = (typeof ENV_VAR_MANIFEST)[number]["key"];

export function deriveSecretKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  return new Set(
    manifest.filter((entry) => entry.secret).map((entry) => entry.key)
  );
}

export function deriveLocalOnlyKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  return new Set(
    manifest.filter((entry) => entry.localOnly).map((entry) => entry.key)
  );
}

export function deriveVercelProductionKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  return manifest
    .filter((entry) => entry.vercelProduction)
    .map((entry) => entry.key);
}

/** Vercel allowlist keys that must not block validate/audit when unset (tenant-owned). */
export function deriveSyncOptionalKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  return new Set(
    manifest
      .filter((entry) => entry.vercelProduction && entry.syncOptional)
      .map((entry) => entry.key)
  );
}

/**
 * Canonical production keys expected locally and on Vercel for validate/audit.
 * Excludes syncOptional tenant keys (e.g. FFT ERP vendor pack).
 */
export function deriveCanonicalVercelKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  const optional = deriveSyncOptionalKeys(manifest);
  return deriveVercelProductionKeys(manifest).filter(
    (key) => !optional.has(key)
  );
}

export function deriveStaleVercelKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  return manifest.filter((entry) => entry.stale).map((entry) => entry.key);
}

export function deriveRuntimeEnvKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  return manifest.filter((entry) => entry.runtime).map((entry) => entry.key);
}

/** Keys required for pre-sync validation (must be set locally before sync:vercel). */
export function deriveRequiredForSyncKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  return deriveVercelProductionKeys(manifest).filter((key) =>
    manifest.some(
      (entry) =>
        entry.key === key &&
        !entry.syncOptional &&
        (entry.kind === "requiredString" ||
          entry.kind === "requiredUrl" ||
          entry.kind === "requiredMinPassword" ||
          entry.kind === "requiredMinCookieSecret")
    )
  );
}

/** Emails that must be present locally before Vercel sync. */
export function deriveSyncRequiredEmailKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST
) {
  return manifest
    .filter(
      (entry) =>
        entry.vercelProduction &&
        (entry.kind === "optionalEmail" || entry.kind === "optionalEmailFrom")
    )
    .map((entry) => entry.key);
}
