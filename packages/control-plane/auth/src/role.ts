/**
 * Coarse shell / routing signal — not the ARCH-023 permission catalogue.
 * Client-safe (no Next/server imports) so product forms can share the type
 * via `@afenda/auth/client` without pulling the `server-only` barrel.
 */
export type Role = "admin" | "operator" | "client";
