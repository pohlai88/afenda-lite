import type { NeonAuthManifest } from "@/lib/auth/neon-auth.manifest";

/** Closed OAuth provider set supported by Neon Auth UI. */
export const NEON_AUTH_OAUTH_PROVIDER_IDS = [
  "google",
  "github",
  "vercel",
] as const;

export type NeonAuthOAuthProviderId =
  (typeof NEON_AUTH_OAUTH_PROVIDER_IDS)[number];

export function isNeonAuthOAuthProviderId(
  value: string,
): value is NeonAuthOAuthProviderId {
  return (NEON_AUTH_OAUTH_PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Provider-registered redirect URI — NOT the app callbackURL.
 * @see https://neon.com/docs/auth/guides/setup-oauth#production-setup
 */
export function buildNeonAuthOAuthProviderRedirectUri(
  baseUrl: string,
  provider: NeonAuthOAuthProviderId,
): string {
  const normalized = baseUrl.replace(/\/$/, "");
  return `${normalized}/callback/${provider}`;
}

export type NeonAuthSocialUiConfig = {
  providers: NeonAuthOAuthProviderId[];
};

/** Maps materialized branch OAuth providers to NeonAuthUIProvider `social` prop. */
export function neonAuthSocialConfigFromManifest(
  manifest: NeonAuthManifest,
): NeonAuthSocialUiConfig | undefined {
  const providers = (manifest.oauthProviders ?? [])
    .map((entry) => entry.id)
    .filter(isNeonAuthOAuthProviderId);

  if (providers.length === 0) {
    return undefined;
  }

  return { providers };
}
