/** Trimmed FormData string fields for server action boundaries. */
export function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
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
