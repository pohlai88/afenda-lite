/** Keys referenced in .github/workflows/ci.yml */

/** CI-only Neon branch secrets — localhost Playwright; never production auth. */
export const GITHUB_ACTIONS_E2E_NEON_KEYS = [
  "E2E_DATABASE_URL",
  "E2E_NEON_AUTH_BASE_URL",
  "E2E_NEON_AUTH_COOKIE_SECRET",
];

/** Shared test credentials and fixture tokens (same across Neon branches). */
export const GITHUB_ACTIONS_CI_CREDENTIAL_KEYS = [
  "SHARED_ADMIN_EMAIL",
  "SHARED_ADMIN_PASSWORD",
  "CLIENT_DEFAULT_PASSWORD",
  "PREVIEW_CLIENT_EMAIL",
  "PREVIEW_CLIENT_PASSWORD",
  "E2E_SURVEY_SLUG",
  "E2E_INVITE_TOKEN",
];

export const GITHUB_ACTIONS_CI_KEYS = [
  ...GITHUB_ACTIONS_E2E_NEON_KEYS,
  ...GITHUB_ACTIONS_CI_CREDENTIAL_KEYS,
];

/** Legacy repo secrets from pre–Option-1 CI — not required when ci.yml uses E2E_* Neon keys. */
export const GITHUB_ACTIONS_LEGACY_NEON_KEYS = [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
];

export const GITHUB_ACTIONS_STALE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
