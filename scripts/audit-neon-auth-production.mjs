/**
 * Neon Auth production checklist audit (Neon docs: auth/guides/production-checklist).
 *
 * Compares live/materialized config against iam-check launch policy.
 * Does not print secrets. Exit 1 when strict mode finds blocking gaps.
 *
 * Usage:
 *   npm run audit:neon-auth-production
 *   npm run audit:neon-auth-production -- --strict
 */
import { readFileSync } from "node:fs";
import { loadComposedEnv, getEnvValue } from "./lib/env-files.mjs";

const strict = process.argv.includes("--strict");
const env = loadComposedEnv();
const appUrl = (getEnvValue("APP_URL", env) ?? "https://iam-check.vercel.app").replace(
  /\/$/,
  "",
);
const portalApplicationName =
  getEnvValue("NEON_AUTH_APPLICATION_NAME", env) ?? "Client Declaration Portal";

const manifest = JSON.parse(
  readFileSync("lib/auth/neon-auth.manifest.json", "utf8"),
);

const liveSnapshot = {
  trustedOrigins: manifest.trustedDomains ?? [],
  allowLocalhost: manifest.allowLocalhost ?? null,
  emailProviderType: manifest.emailProvider?.type ?? "unknown",
  emailVerificationMethod: manifest.emailPassword?.emailVerificationMethod ?? "unknown",
  verifyEmailOnSignUp: manifest.emailPassword?.sendVerificationEmailOnSignUp ?? false,
  requireEmailVerification: manifest.emailPassword?.requireEmailVerification ?? false,
  oauthProviders: manifest.oauthProviders ?? [],
  uiSocialEnabled: manifest.ui?.features?.social === true,
  neonProjectName: manifest.project?.projectName ?? "iam-check",
};

const checks = [];

function record(id, title, status, detail, remediation) {
  checks.push({ id, title, status, detail, remediation });
}

function normalizeOrigin(value) {
  return value.replace(/\/$/, "");
}

// 1. Trusted domains
const hasAppUrl = liveSnapshot.trustedOrigins.some(
  (origin) => normalizeOrigin(origin) === appUrl,
);
record(
  "1-trusted-domains",
  "Configure trusted domains",
  hasAppUrl ? "pass" : "fail",
  hasAppUrl
    ? `APP_URL ${appUrl} is trusted. Origins: ${liveSnapshot.trustedOrigins.join(", ")}`
    : `APP_URL ${appUrl} missing from trusted origins (${liveSnapshot.trustedOrigins.join(", ") || "none"})`,
  hasAppUrl
    ? "Add custom domains before cutover: npm run configure:neon-auth-production -- --add-trusted-origin <url>"
    : "npm run configure:neon-auth-production -- --sync-trusted-domains",
);

// 2. Email provider — project policy waives custom SMTP when using OTP (AGENTS.md)
const sharedEmail = liveSnapshot.emailProviderType === "shared";
const otpVerification = liveSnapshot.emailVerificationMethod === "otp";
if (sharedEmail && otpVerification) {
  record(
    "2-email-provider",
    "Set up custom email provider",
    strict ? "fail" : "waived",
    "Shared provider (auth@mail.myneon.app) with OTP verification — allowed by portal policy; rate-limited for high volume.",
    strict
      ? "Configure BYO SMTP via Neon Console or npm run configure:neon-auth-production -- --smtp (requires env secrets)"
      : "Waived: portal uses OTP not verification links. Revisit if invite volume hits shared limits.",
  );
} else if (!sharedEmail) {
  record(
    "2-email-provider",
    "Set up custom email provider",
    "pass",
    `Custom email provider configured (${liveSnapshot.emailProviderType}).`,
    null,
  );
} else {
  record(
    "2-email-provider",
    "Set up custom email provider",
    "fail",
    "Shared provider with non-OTP verification — custom SMTP required for verification links.",
    "Switch to OTP (current) or configure custom SMTP in Neon Console → Auth.",
  );
}

// 3. Application name
record(
  "3-application-name",
  "Customize application name",
  "manual",
  `Portal UI name: "${portalApplicationName}". Neon project name: "${liveSnapshot.neonProjectName}". Set Application Name in Neon Console → Auth → Configuration if they should match.`,
  "Neon Console → Auth → Configuration → Application Name → Client Declaration Portal",
);

// 4. OAuth — branch may have shared providers; UI social login is product-controlled
const sharedOAuth = liveSnapshot.oauthProviders.filter(
  (provider) => provider.type === "shared",
);
if (!liveSnapshot.uiSocialEnabled) {
  record(
    "4-oauth",
    "Configure OAuth credentials (if using OAuth)",
    "waived",
    sharedOAuth.length
      ? `Shared OAuth on branch (${sharedOAuth.map((p) => p.id).join(", ")}) — UI social login is off; no action.`
      : "OAuth not configured — credentials/email-password only.",
    "Enable ui.features.social in lib/auth/neon-auth.manifest.json only if product adds social sign-in.",
  );
} else if (sharedOAuth.length > 0) {
  record(
    "4-oauth",
    "Configure OAuth credentials (if using OAuth)",
    "waived",
    `Social login enabled with Neon shared OAuth (${sharedOAuth.map((p) => p.id).join(", ")}).`,
    "Switch to BYO OAuth in Neon Console if you need custom Google branding.",
  );
} else {
  record(
    "4-oauth",
    "Configure OAuth credentials (if using OAuth)",
    "pass",
    "Social login enabled with non-shared OAuth configuration.",
    null,
  );
}

// 5. Email verification
const verificationPartial =
  liveSnapshot.verifyEmailOnSignUp && !liveSnapshot.requireEmailVerification;
record(
  "5-email-verification",
  "Enable email verification (recommended)",
  verificationPartial ? "pass" : liveSnapshot.requireEmailVerification ? "pass" : "fail",
  verificationPartial
    ? "Verify at sign-up enabled (OTP). require_email_verification=false preserves /join flow (sign up → sign in → accept invitation)."
    : liveSnapshot.requireEmailVerification
      ? "require_email_verification=true — blocks unverified sign-in."
      : "Email verification not enabled at sign-up.",
  verificationPartial
    ? null
    : "Neon Console → Auth → enable Verify at sign-up with Verification code (OTP).",
);

// 6. Localhost access
const localhostInTrustedOrigins = liveSnapshot.trustedOrigins.some((origin) =>
  origin.toLowerCase().includes("localhost"),
);
const localhostAllowed =
  liveSnapshot.allowLocalhost !== false || localhostInTrustedOrigins;
record(
  "6-localhost",
  "Disable localhost access (production)",
  localhostAllowed ? "manual" : "pass",
  localhostAllowed
    ? `allow_localhost is enabled (or localhost is trusted). Origins: ${liveSnapshot.trustedOrigins.join(", ") || "none"}. Disable at production cutover or remove localhost from trusted domains.`
    : "Localhost access disabled on this branch (no localhost trusted origin).",
  "npm run configure:neon-auth-production -- --disable-localhost (production cutover only)",
);

const statusOrder = { fail: 0, manual: 1, waived: 2, pass: 3 };
checks.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

console.log("=== Neon Auth production checklist (iam-check) ===\n");
console.log(`APP_URL: ${appUrl}`);
console.log(`Branch: ${manifest.project.branchName} (${manifest.project.branchId})`);
console.log(`Manifest synced: ${manifest.syncedAt}\n`);

for (const check of checks) {
  const icon =
    check.status === "pass"
      ? "[x]"
      : check.status === "waived"
        ? "[~]"
        : check.status === "manual"
          ? "[ ]"
          : "[!]";
  console.log(`${icon} ${check.id} ${check.title}`);
  console.log(`    ${check.detail}`);
  if (check.remediation) {
    console.log(`    → ${check.remediation}`);
  }
  console.log("");
}

const failures = checks.filter((c) => c.status === "fail");

if (failures.length === 0) {
  console.log(
    strict
      ? "Strict audit: no blocking failures."
      : "No blocking failures. Complete manual items before launch.",
  );
  process.exit(0);
}

console.error(`\nBlocking failures: ${failures.length}`);
for (const failure of failures) {
  console.error(`  - ${failure.id}: ${failure.title}`);
}
process.exit(1);
