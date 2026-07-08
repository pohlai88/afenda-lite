import { describe, expect, it } from "vitest";
import manifest from "@/config/neon-auth.manifest.json";
import {
  buildNeonAuthOAuthProviderRedirectUri,
  isNeonAuthOAuthProviderId,
  neonAuthSocialConfigFromManifest,
} from "@/lib/auth/neon-auth-oauth";

describe("neon-auth oauth", () => {
  it("builds provider redirect URIs per Neon OAuth docs", () => {
    expect(
      buildNeonAuthOAuthProviderRedirectUri(
        "https://ep-example.neonauth.us-east-2.aws.neon.tech/neondb/auth/",
        "google",
      ),
    ).toBe(
      "https://ep-example.neonauth.us-east-2.aws.neon.tech/neondb/auth/callback/google",
    );
  });

  it("recognizes supported provider ids", () => {
    expect(isNeonAuthOAuthProviderId("google")).toBe(true);
    expect(isNeonAuthOAuthProviderId("twitter")).toBe(false);
  });

  it("maps manifest oauth providers to social UI config", () => {
    const social = neonAuthSocialConfigFromManifest(manifest);
    expect(social).toEqual({ providers: ["google"] });
  });
});
