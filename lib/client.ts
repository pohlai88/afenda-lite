export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}
