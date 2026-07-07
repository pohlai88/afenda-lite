import { checkDbConnection, getDatabaseConnectionMeta } from "@/lib/db";
import { buildNeonAuthJwksUrl, probeNeonAuthEnv, type EnvBag } from "@/lib/auth/env";

const JWKS_PROBE_TIMEOUT_MS = 5_000;

export type ReadinessAuthStatus = "configured" | "missing" | "degraded";

export type ReadinessConnectionMeta = {
  pooler: boolean;
  ssl: string;
};

export type ReadinessSnapshot = {
  status: "ready" | "degraded";
  topology: string;
  storage: string;
  connection: ReadinessConnectionMeta;
  auth: ReadinessAuthStatus;
  timestamp: string;
};

export type ReadinessEnv = {
  databaseUrl?: string;
  neonAuthBaseUrl?: string;
  neonAuthCookieSecret?: string;
};

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Probe only the env vars readiness depends on — never throw on partial config. */
export function probeReadinessEnv(
  env: EnvBag = process.env,
): ReadinessEnv {
  const authEnv = probeNeonAuthEnv(env);

  return {
    databaseUrl: nonEmpty(env.DATABASE_URL),
    neonAuthBaseUrl: authEnv.baseUrl,
    neonAuthCookieSecret: authEnv.cookieSecret,
  };
}

export async function probeAuthStatus(
  env: ReadinessEnv,
): Promise<ReadinessAuthStatus> {
  if (!env.neonAuthBaseUrl || !env.neonAuthCookieSecret) {
    return "missing";
  }

  try {
    const response = await fetch(buildNeonAuthJwksUrl(env.neonAuthBaseUrl), {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(JWKS_PROBE_TIMEOUT_MS),
    });
    return response.ok ? "configured" : "degraded";
  } catch {
    return "degraded";
  }
}

export function evaluateReadinessStatus(input: {
  env: ReadinessEnv;
  storage: string;
  connection: ReadinessConnectionMeta;
  auth: ReadinessAuthStatus;
  nodeEnv?: string;
}): ReadinessSnapshot["status"] {
  const requirePooler = (input.nodeEnv ?? process.env.NODE_ENV) === "production";
  const infrastructureReady =
    Boolean(input.env.databaseUrl) &&
    Boolean(input.env.neonAuthBaseUrl) &&
    Boolean(input.env.neonAuthCookieSecret) &&
    input.storage === "Database connected" &&
    (!requirePooler || input.connection.pooler);

  return infrastructureReady && input.auth === "configured"
    ? "ready"
    : "degraded";
}

export async function collectReadinessSnapshot(): Promise<ReadinessSnapshot> {
  const env = probeReadinessEnv();
  const [storage, auth] = await Promise.all([
    checkDbConnection(),
    probeAuthStatus(env),
  ]);
  const connection = getDatabaseConnectionMeta();

  return {
    status: evaluateReadinessStatus({ env, storage, connection, auth }),
    topology: "Next.js App Router with Neon Auth and Postgres",
    storage,
    connection,
    auth,
    timestamp: new Date().toISOString(),
  };
}
