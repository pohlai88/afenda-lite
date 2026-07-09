import "server-only";

import { MIN_NEON_AUTH_COOKIE_SECRET_LENGTH } from "@/lib/env/constants";

const MIN_COOKIE_SECRET_LENGTH = MIN_NEON_AUTH_COOKIE_SECRET_LENGTH;

/** Env bag for probes — accepts partial records in unit tests. */
export type EnvBag = Record<string, string | undefined>;

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function nonEmptyCookieSecret(value: string | undefined): string | undefined {
  const trimmed = nonEmpty(value);
  return trimmed && trimmed.length >= MIN_COOKIE_SECRET_LENGTH
    ? trimmed
    : undefined;
}

export type NeonAuthEnv = {
  baseUrl: string;
  cookieSecret: string;
};

export type NeonAuthEnvProbe = {
  baseUrl?: string;
  cookieSecret?: string;
};

/** Non-throwing probe for health checks and partial config reporting. */
export function probeNeonAuthEnv(
  env: EnvBag = process.env,
): NeonAuthEnvProbe {
  return {
    baseUrl: nonEmpty(env.NEON_AUTH_BASE_URL),
    cookieSecret: nonEmptyCookieSecret(env.NEON_AUTH_COOKIE_SECRET),
  };
}

export function buildNeonAuthJwksUrl(baseUrl: string): URL {
  return new URL(
    ".well-known/jwks.json",
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
}

/** Required Neon Auth config for server runtime — throws when invalid. */
export function readNeonAuthEnv(
  env: EnvBag = process.env,
): NeonAuthEnv {
  const probe = probeNeonAuthEnv(env);

  if (!probe.baseUrl) {
    throw new Error("NEON_AUTH_BASE_URL is required");
  }

  if (!probe.cookieSecret) {
    throw new Error(
      "NEON_AUTH_COOKIE_SECRET must be at least 32 characters",
    );
  }

  return {
    baseUrl: probe.baseUrl,
    cookieSecret: probe.cookieSecret,
  };
}
