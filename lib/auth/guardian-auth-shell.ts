/**
 * Guardian auth shell feature flag (SPEC-B / ADR-Auth-UI-001).
 *
 * `GUARDIAN_AUTH_SHELL=false` restores PortalAuthLayout + Neon for rollback.
 * Default: enabled (Guardian + Neon on `/auth/*`).
 */
export function isGuardianAuthShellEnabled(): boolean {
  const raw = process.env.GUARDIAN_AUTH_SHELL?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  return true;
}
