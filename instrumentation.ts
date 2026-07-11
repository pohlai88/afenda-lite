export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/modules/platform/env/server");
    validateServerEnv();

    const { assertNeonAuthManifestMatchesEnv } = await import(
      "@/modules/identity/auth/neon-auth.manifest"
    );
    assertNeonAuthManifestMatchesEnv();
  }
}