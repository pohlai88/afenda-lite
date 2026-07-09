import { parseServerEnv, type ServerEnv } from "@/lib/env/schema";

export type { ServerEnv } from "@/lib/env/schema";
export { serverEnvSchema, parseServerEnv } from "@/lib/env/schema";

let cachedEnv: ServerEnv | null = null;

/** Clears cached env — for unit tests that mutate process.env. */
export function resetServerEnvCache() {
  cachedEnv = null;
}

export function validateServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = parseServerEnv(process.env as Record<string, string | undefined>);
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
