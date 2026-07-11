/** Shared email normalization — Platform-owned (no product-domain coupling). */
export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}
