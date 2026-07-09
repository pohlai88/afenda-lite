/**
 * Build lib/auth/neon-auth.manifest.json from Neon CLI/API snapshots.
 * UI feature flags (e.g. social login) stay product-controlled in the committed manifest.
 */

/** Prefer Neon status; infer from trusted domains when CLI omits the flag. */
export function resolveAllowLocalhost(statusJson, domainsJson) {
  if (typeof statusJson?.allow_localhost === "boolean") {
    return statusJson.allow_localhost;
  }

  const trustedDomains = (domainsJson ?? []).map((entry) =>
    String(entry.domain ?? entry).toLowerCase(),
  );
  const localhostTrusted = trustedDomains.some((domain) =>
    domain.includes("localhost"),
  );

  return localhostTrusted;
}

export function parseJsonOutput(raw) {
  const start = raw.indexOf("{");
  const arrayStart = raw.indexOf("[");
  const index =
    start === -1
      ? arrayStart
      : arrayStart === -1
        ? start
        : Math.min(start, arrayStart);
  if (index === -1) {
    throw new Error(`Unexpected neon CLI output: ${raw}`);
  }
  return JSON.parse(raw.slice(index));
}

export function buildNeonAuthManifest({
  neonFile,
  existing,
  statusJson,
  emailPasswordJson,
  emailProviderJson,
  domainsJson,
  oauthProvidersJson,
  magicLinkJson,
  organizationJson,
}) {
  const baseUrl = statusJson.base_url.replace(/\/$/, "");

  const oauthProviders = oauthProvidersJson.map((entry) => ({
    id: entry.id,
    type: entry.type,
    providerRedirectUri: `${baseUrl}/callback/${entry.id}`,
  }));

  const socialProviders = oauthProviders
    .map((entry) => entry.id)
    .filter((id) => ["google", "github", "vercel"].includes(id));

  const uiSocialEnabled = existing.ui?.features?.social === true;

  return {
    version: existing.version ?? 1,
    syncedAt: new Date().toISOString(),
    project: {
      projectId: neonFile.projectId,
      projectName: neonFile.projectName,
      branchId: neonFile.branchId,
      branchName: neonFile.branchName,
      orgId: neonFile.orgId,
    },
    integration: {
      authProvider: statusJson.auth_provider,
      authProviderProjectId: statusJson.auth_provider_project_id,
      baseUrl: statusJson.base_url,
      jwksUrl: statusJson.jwks_url,
      dbName: statusJson.db_name,
    },
    emailPassword: {
      enabled: emailPasswordJson.enabled,
      emailVerificationMethod: emailPasswordJson.email_verification_method,
      requireEmailVerification: emailPasswordJson.require_email_verification,
      autoSignInAfterVerification:
        emailPasswordJson.auto_sign_in_after_verification,
      sendVerificationEmailOnSignUp:
        emailPasswordJson.send_verification_email_on_sign_up,
      sendVerificationEmailOnSignIn:
        emailPasswordJson.send_verification_email_on_sign_in,
      disableSignUp: emailPasswordJson.disable_sign_up,
    },
    emailProvider: {
      type: emailProviderJson.type,
      senderEmail: emailProviderJson.sender_email,
      senderName: emailProviderJson.sender_name,
    },
    plugins: {
      ...(magicLinkJson
        ? {
            magicLink: {
              enabled: Boolean(magicLinkJson.enabled),
              expiresInMinutes: magicLinkJson.expires_in ?? 15,
              disableSignUp: Boolean(magicLinkJson.disable_sign_up),
            },
          }
        : existing.plugins?.magicLink
          ? { magicLink: existing.plugins.magicLink }
          : {}),
      ...(organizationJson
        ? {
            organization: {
              enabled: Boolean(organizationJson.enabled),
              organizationLimit: organizationJson.organization_limit ?? 10,
              membershipLimit: organizationJson.membership_limit ?? 100,
              creatorRole: organizationJson.creator_role ?? "owner",
              sendInvitationEmail: Boolean(
                organizationJson.send_invitation_email,
              ),
            },
          }
        : existing.plugins?.organization
          ? { organization: existing.plugins.organization }
          : {}),
    },
    oauthProviders,
    trustedDomains: domainsJson.map((entry) => entry.domain),
    allowLocalhost: resolveAllowLocalhost(statusJson, domainsJson),
    productionChecklist: existing.productionChecklist ?? {
      applicationName: "Client Declaration Portal",
      emailProviderPolicy: "shared-otp-waiver",
      requireLocalhostDisabledAtCutover: true,
    },
    ui: {
      basePath: existing.ui?.basePath ?? "/auth",
      accountBasePath: existing.ui?.accountBasePath ?? "/account",
      features: {
        organization: organizationJson
          ? Boolean(organizationJson.enabled)
          : (existing.ui?.features?.organization ?? true),
        emailOTP: existing.ui?.features?.emailOTP ?? true,
        emailVerification: existing.ui?.features?.emailVerification ?? true,
        magicLink: magicLinkJson
          ? Boolean(magicLinkJson.enabled)
          : (existing.ui?.features?.magicLink ?? true),
        credentials: existing.ui?.features?.credentials ?? {
          forgotPassword: true,
        },
        signUp: existing.ui?.features?.signUp ?? true,
        social: uiSocialEnabled,
        ...(uiSocialEnabled ? { socialProviders } : {}),
      },
    },
  };
}
