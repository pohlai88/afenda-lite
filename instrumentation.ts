export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/lib/env/server");
    validateServerEnv();

    const { assertNeonAuthManifestMatchesEnv } = await import(
      "@/lib/auth/neon-auth.manifest"
    );
    assertNeonAuthManifestMatchesEnv();
  }
}