import { z } from "zod";

export function emptyToUndefined(value: unknown) {
  return value === "" || value === undefined ? undefined : value;
}

export function optionalString() {
  return z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  );
}

export function optionalEmail() {
  return z.preprocess((value) => {
    const normalized = emptyToUndefined(value);
    if (typeof normalized !== "string") {
      return undefined;
    }
    const trimmed = normalized.trim();
    return trimmed ? trimmed : undefined;
  }, z.string().email().optional());
}

export function optionalUuid() {
  return z.preprocess(
    emptyToUndefined,
    z.string().uuid().optional(),
  );
}

export function optionalUrl() {
  return z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  );
}

export function optionalBooleanStringFlag() {
  return z.preprocess(
    emptyToUndefined,
    z.enum(["true", "false"]).optional(),
  );
}
