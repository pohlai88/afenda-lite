import { describe, expect, it } from "vitest";
import ciManifest from "@/lib/auth/neon-auth.manifest.ci.json";
import manifest from "@/lib/auth/neon-auth.manifest.json";
import {
  assertNeonAuthManifestMatchesEnv,
  getNeonAuthManifest,
  getNeonAuthManifestProfile,
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
    const previous = process.env.NEON_AUTH_MANIFEST_PROFILE;
    delete process.env.NEON_AUTH_MANIFEST_PROFILE;
    try {
      const loaded = getNeonAuthManifest();
      expect(loaded.integration.baseUrl).toBe(manifest.integration.baseUrl);
      expect(loaded.ui.basePath).toBe("/auth");
    } finally {
      if (previous === undefined) {
        delete process.env.NEON_AUTH_MANIFEST_PROFILE;
      } else {
        process.env.NEON_AUTH_MANIFEST_PROFILE = previous;
      }
    }
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

  it("enables social login from materialized OAuth (Google shared)", () => {
    expect(neonAuthUiFeatures.social).toBe(true);
    expect(neonAuthUiProviderDefaults.social).toEqual({ providers: ["google"] });
    expect(neonAuthUiFeatures.magicLink).toBe(true);
  });

  it("derives social providers from materialized oauth config when enabled", () => {
    expect(manifest.ui.features.social).toBe(true);
    expect(manifest.oauthProviders?.length).toBeGreaterThan(0);
    const social = neonAuthSocialConfigFromManifest(manifest);
    expect(social?.providers).toContain("google");
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

  it("loads CI manifest profile when NEON_AUTH_MANIFEST_PROFILE=ci", () => {
    const previous = process.env.NEON_AUTH_MANIFEST_PROFILE;
    process.env.NEON_AUTH_MANIFEST_PROFILE = "ci";
    try {
      expect(getNeonAuthManifestProfile()).toBe("ci");
      expect(getNeonAuthManifest().integration.baseUrl).toBe(
        ciManifest.integration.baseUrl,
      );
      expect(getNeonAuthManifest().allowLocalhost).toBe(true);
      expect(getNeonAuthManifest().project.branchName).toBe("ci");
    } finally {
      if (previous === undefined) {
        delete process.env.NEON_AUTH_MANIFEST_PROFILE;
      } else {
        process.env.NEON_AUTH_MANIFEST_PROFILE = previous;
      }
    }
  });
});
