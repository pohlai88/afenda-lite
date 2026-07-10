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
    secret: true,
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "APP_URL",
    kind: "optionalUrl",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "VERCEL_URL",
    kind: "optionalString",
    runtime: true,
  },
  {
    key: "SHARED_ADMIN_EMAIL",
    kind: "optionalEmail",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "SHARED_ADMIN_PASSWORD",
    kind: "optionalString",
    secret: true,
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "SHARED_ADMIN_NAME",
    kind: "optionalString",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "PREVIEW_CLIENT_EMAIL",
    kind: "optionalEmail",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "PREVIEW_CLIENT_PASSWORD",
    kind: "optionalString",
    secret: true,
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "PREVIEW_CLIENT_NAME",
    kind: "optionalString",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "CLIENT_DEFAULT_PASSWORD",
    kind: "requiredMinPassword",
    secret: true,
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "NEON_AUTH_BASE_URL",
    kind: "requiredUrl",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "NEON_AUTH_COOKIE_SECRET",
    kind: "requiredMinCookieSecret",
    secret: true,
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "GUARDIAN_AUTH_SHELL",
    kind: "optionalBooleanFlag",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "HOT_SALES_RBAC_ENABLED",
    kind: "optionalBooleanFlag",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "HOT_SALES_DEPOSIT_ENABLED",
    kind: "optionalBooleanFlag",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "HOT_SALES_PICKUP_OPS_ENABLED",
    kind: "optionalBooleanFlag",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "HOT_SALES_NOTIFICATIONS_ENABLED",
    kind: "optionalBooleanFlag",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "HOT_SALES_EMAIL_FROM",
    kind: "optionalEmail",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "RESEND_API_KEY",
    kind: "optionalString",
    secret: true,
    localOnly: true,
  },
  {
    key: "HOT_SALES_ERP_SYNC_ENABLED",
    kind: "optionalBooleanFlag",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "HOT_SALES_ERP_VENDOR",
    kind: "optionalString",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "HOT_SALES_ERP_BASE_URL",
    kind: "optionalString",
    vercelProduction: true,
    runtime: true,
  },
  {
    key: "HOT_SALES_ERP_API_KEY",
    kind: "optionalString",
    secret: true,
    localOnly: true,
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

  // —— Script / tooling only (not in serverEnvSchema) ——
  { key: "NEON_API_KEY", kind: "optionalString", secret: true, localOnly: true },
  { key: "NEON_ORG_ID", kind: "optionalString", localOnly: true },
  { key: "NEON_PROJECT_ID", kind: "optionalString", localOnly: true },
  { key: "NEON_BRANCH_ID", kind: "optionalString", localOnly: true },
  {
    key: "SHADCN_STUDIO_API_KEY",
    kind: "optionalString",
    secret: true,
    localOnly: true,
  },
  { key: "SHADCN_STUDIO_EMAIL", kind: "optionalString", localOnly: true },
  { key: "LICENSE_KEY", kind: "optionalString", secret: true, localOnly: true },
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

type InferEnvValue<K extends EnvVarKind> =
  K extends
    | "requiredString"
    | "requiredUrl"
    | "requiredMinPassword"
    | "requiredMinCookieSecret"
    ? string
    : K extends
        | "optionalString"
        | "optionalEmail"
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
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST,
) {
  return new Set(manifest.filter((entry) => entry.secret).map((entry) => entry.key));
}

export function deriveLocalOnlyKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST,
) {
  return new Set(
    manifest.filter((entry) => entry.localOnly).map((entry) => entry.key),
  );
}

export function deriveVercelProductionKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST,
) {
  return manifest
    .filter((entry) => entry.vercelProduction)
    .map((entry) => entry.key);
}

export function deriveStaleVercelKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST,
) {
  return manifest.filter((entry) => entry.stale).map((entry) => entry.key);
}

export function deriveRuntimeEnvKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST,
) {
  return manifest.filter((entry) => entry.runtime).map((entry) => entry.key);
}

/** Keys required for pre-sync validation (must be set locally before sync:vercel). */
export function deriveRequiredForSyncKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST,
) {
  return deriveVercelProductionKeys(manifest).filter((key) =>
    manifest.some(
      (entry) =>
        entry.key === key &&
        (entry.kind === "requiredString" ||
          entry.kind === "requiredUrl" ||
          entry.kind === "requiredMinPassword" ||
          entry.kind === "requiredMinCookieSecret"),
    ),
  );
}

/** Emails that must be present locally before Vercel sync. */
export function deriveSyncRequiredEmailKeys(
  manifest: readonly EnvVarDef[] = ENV_VAR_MANIFEST,
) {
  return manifest
    .filter((entry) => entry.vercelProduction && entry.kind === "optionalEmail")
    .map((entry) => entry.key);
}
