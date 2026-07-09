import { describe, expect, it } from "vitest";
import manifest from "@/lib/auth/neon-auth.manifest.json";
import {
  assertNeonAuthManifestMatchesEnv,
  getNeonAuthManifest,
} from "@/lib/auth/neon-auth.manifest";
import {
  neonAuthUiAccount,
  neonAuthUiFeatures,
  neonAuthUiProviderDefaults,
  NEON_AUTH_ACCOUNT_BASE_PATH,
  NEON_AUTH_UI_BASE_PATH,
} from "@/lib/auth/neon-auth-ui.config";
import { neonAuthSocialConfigFromManifest } from "@/lib/auth/neon-auth-oauth";

describe("neon-auth manifest", () => {
  it("loads committed manifest snapshot", () => {
    const loaded = getNeonAuthManifest();
    expect(loaded.integration.baseUrl).toBe(manifest.integration.baseUrl);
    expect(loaded.ui.basePath).toBe("/auth");
  });

  it("aligns UI feature flags with provider defaults", () => {
    expect(neonAuthUiFeatures.organization).toBe(true);
    expect(neonAuthUiFeatures.emailOTP).toBe(true);
    expect(neonAuthUiFeatures.magicLink).toBe(true);
    expect(NEON_AUTH_UI_BASE_PATH).toBe(manifest.ui.basePath);
    expect(NEON_AUTH_ACCOUNT_BASE_PATH).toBe(manifest.ui.accountBasePath);
  });

  it("configures signed-in user management for AccountView", () => {
    expect(neonAuthUiAccount.basePath).toBe("/account");
    expect(neonAuthUiAccount.fields).toEqual(["name"]);
    expect(neonAuthUiProviderDefaults.changeEmail).toBe(false);
  });

  it("keeps social login off unless product enables it in manifest", () => {
    expect(neonAuthUiFeatures.social).toBe(false);
    expect(neonAuthUiProviderDefaults.social).toBeUndefined();
  });

  it("derives social providers from materialized oauth config when enabled", () => {
    if (manifest.ui.features.social !== true || !manifest.oauthProviders?.length) {
      return;
    }
    const social = neonAuthSocialConfigFromManifest(manifest);
    expect(social?.providers.length).toBeGreaterThan(0);
  });

  it("declares organization plugin policy in manifest", () => {
    expect(manifest.plugins?.organization?.enabled).toBe(true);
    expect(manifest.plugins?.organization?.sendInvitationEmail).toBe(true);
  });

  it("matches NEON_AUTH_BASE_URL when env is composed", () => {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    if (!baseUrl) {
      return;
    }
    expect(() => assertNeonAuthManifestMatchesEnv()).not.toThrow();
  });
});
