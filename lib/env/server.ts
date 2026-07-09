import { z } from "zod";

function optionalString() {
  return z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().min(1).optional(),
  );
}

function optionalEmail() {
  return z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().email().optional(),
  );
}

function optionalUuid() {
  return z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().uuid().optional(),
  );
}

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().url().optional(),
  ),
  VERCEL_URL: optionalString(),
  SHARED_ADMIN_EMAIL: optionalEmail(),
  SHARED_ADMIN_PASSWORD: optionalString(),
  SHARED_ADMIN_NAME: optionalString(),
  PREVIEW_CLIENT_EMAIL: optionalEmail(),
  PREVIEW_CLIENT_PASSWORD: optionalString(),
  PREVIEW_CLIENT_NAME: optionalString(),
  PLAYGROUND_ENABLED: z.enum(["true", "false"]).optional(),
  PLAYGROUND_SURVEY_ID: optionalUuid(),
  PLAYGROUND_ASSIGNMENT_ID: optionalUuid(),
  PLAYGROUND_SURVEY_SLUG: optionalString(),
  CLIENT_DEFAULT_PASSWORD: z
    .string()
    .min(8, "CLIENT_DEFAULT_PASSWORD must be at least 8 characters"),
  NEON_AUTH_BASE_URL: z.string().url("NEON_AUTH_BASE_URL must be a valid URL"),
  NEON_AUTH_COOKIE_SECRET: z
    .string()
    .min(32, "NEON_AUTH_COOKIE_SECRET must be at least 32 characters"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function validateServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${details}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function getServerEnv(): ServerEnv {
  return validateServerEnv();
}
