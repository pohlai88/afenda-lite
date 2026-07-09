import type { z } from "zod";
import { buildServerEnvSchema } from "@/lib/env/build-schema";
import { ENV_VAR_MANIFEST, type ServerEnv } from "@/lib/env/manifest";

/**
 * Runtime server environment validated at Node startup (instrumentation.ts).
 * Compose from env.config + env.secret — see AGENTS.md.
 */
export const serverEnvSchema = buildServerEnvSchema(
  ENV_VAR_MANIFEST,
) as unknown as z.ZodType<ServerEnv>;

export type { ServerEnv } from "@/lib/env/manifest";

/** Parse a partial env bag (tests, health probes, pre-sync validation). */
export function parseServerEnv(env: Record<string, string | undefined>) {
  return serverEnvSchema.safeParse(env);
}

export { ENV_VAR_MANIFEST } from "@/lib/env/manifest";
