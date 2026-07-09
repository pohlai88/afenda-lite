import type { HotSalesFieldDef } from "@/lib/domain/trade/types";

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export function sanitizeFieldKey(key: string): string | null {
  const trimmed = key.trim().toLowerCase();
  if (!FIELD_KEY_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function validateOrderAttrs(
  fieldDefs: HotSalesFieldDef[],
  attrs: Record<string, unknown>,
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const activeOrderFields = fieldDefs.filter(
    (f) => f.active && f.entityType === "order",
  );

  for (const def of activeOrderFields) {
    const value = attrs[def.fieldKey];

    if (def.required && (value === undefined || value === null || value === "")) {
      errors[def.fieldKey] = "required";
      continue;
    }

    if (value === undefined || value === null || value === "") {
      continue;
    }

    switch (def.fieldType) {
      case "number":
      case "currency":
        if (typeof value !== "number" || Number.isNaN(value)) {
          errors[def.fieldKey] = "invalid_number";
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          errors[def.fieldKey] = "invalid_boolean";
        }
        break;
      case "select":
        if (
          def.dropdownOptions &&
          !def.dropdownOptions.includes(String(value))
        ) {
          errors[def.fieldKey] = "invalid_option";
        }
        break;
      case "text":
      case "long_text":
      case "date":
      case "datetime":
        if (typeof value !== "string") {
          errors[def.fieldKey] = "invalid_text";
        }
        break;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function applyFieldDefaults(
  fieldDefs: HotSalesFieldDef[],
  attrs: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...attrs };
  for (const def of fieldDefs.filter((f) => f.active && f.entityType === "order")) {
    if (
      (result[def.fieldKey] === undefined || result[def.fieldKey] === null) &&
      def.defaultValue !== null
    ) {
      switch (def.fieldType) {
        case "number":
        case "currency":
          result[def.fieldKey] = Number(def.defaultValue);
          break;
        case "boolean":
          result[def.fieldKey] = def.defaultValue === "true";
          break;
        default:
          result[def.fieldKey] = def.defaultValue;
      }
    }
  }
  return result;
}
