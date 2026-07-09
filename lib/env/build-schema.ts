import { z } from "zod";
import {
  MIN_CLIENT_DEFAULT_PASSWORD_LENGTH,
  MIN_NEON_AUTH_COOKIE_SECRET_LENGTH,
} from "@/lib/env/constants";
import type { EnvVarDef, EnvVarKind } from "@/lib/env/manifest";
import {
  optionalBooleanStringFlag,
  optionalEmail,
  optionalString,
  optionalUrl,
  optionalUuid,
} from "@/lib/env/preprocess";

export function zodFieldForEnvKind(kind: EnvVarKind, key: string) {
  switch (kind) {
    case "requiredString":
      return z.string().min(1, `${key} is required`);
    case "requiredUrl":
      return z.string().url(`${key} must be a valid URL`);
    case "requiredMinPassword":
      return z
        .string()
        .min(
          MIN_CLIENT_DEFAULT_PASSWORD_LENGTH,
          `${key} must be at least ${MIN_CLIENT_DEFAULT_PASSWORD_LENGTH} characters`,
        );
    case "requiredMinCookieSecret":
      return z
        .string()
        .min(
          MIN_NEON_AUTH_COOKIE_SECRET_LENGTH,
          `${key} must be at least ${MIN_NEON_AUTH_COOKIE_SECRET_LENGTH} characters`,
        );
    case "optionalString":
      return optionalString();
    case "optionalEmail":
      return optionalEmail();
    case "optionalUrl":
      return optionalUrl();
    case "optionalUuid":
      return optionalUuid();
    case "optionalBooleanFlag":
      return optionalBooleanStringFlag();
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown env kind: ${_exhaustive}`);
    }
  }
}

export function buildServerEnvSchema(manifest: readonly EnvVarDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const entry of manifest) {
    if (!entry.runtime) {
      continue;
    }
    shape[entry.key] = zodFieldForEnvKind(entry.kind, entry.key);
  }

  return z.object(shape);
}
