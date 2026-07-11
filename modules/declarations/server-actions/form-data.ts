/**
 * Trimmed FormData field readers — SSOT for server action and FormData → Zod boundaries.
 * Password fields are never trimmed; numeric fields stay raw for `z.coerce.number()`.
 */

/** Trimmed FormData string fields for server action boundaries. */
export function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Trimmed string with fallback when the field is missing or blank. */
export function formStringDefault(
  formData: FormData,
  key: string,
  fallback: string,
): string {
  const raw = formData.get(key);
  if (raw == null) {
    return fallback;
  }

  const trimmed = String(raw).trim();
  return trimmed || fallback;
}

/** Password fields are not trimmed — whitespace may be intentional. */
export function formPassword(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

export function formStringList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function formBooleanLiteral(
  formData: FormData,
  key: string,
): "" | "true" {
  return formData.get(key) === "true" ? "true" : "";
}

/** Raw numeric field for Zod `z.coerce.number()` at action boundaries. */
export function formNumberField(formData: FormData, key: string): unknown {
  return formData.get(key) ?? 0;
}
