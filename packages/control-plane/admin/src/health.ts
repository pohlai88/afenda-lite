import { db, sql } from "@afenda/db";
import { env, MAX_SELECT1_LATENCY_MS } from "@afenda/env";

import {
	type HealthAggregate,
	type HealthProbe,
	healthAggregateSchema,
	type LivenessResponse,
	livenessResponseSchema,
	type ReadinessResponse,
	readinessResponseSchema,
} from "./schemas/health";

const TOPOLOGY = "neon-shared-schema" as const;
const STORAGE_PROVIDER = "postgres" as const;
const AUTH_PROVIDER = "neon_auth" as const;
const AUTH_COOKIE_SECRET_MIN_LENGTH = 32;
/** Reuse DB probe budget for Auth HTTP reachability (same readiness SLA class). */
const AUTH_PROBE_TIMEOUT_MS = MAX_SELECT1_LATENCY_MS;

type StorageReachability = ReadinessResponse["checks"]["storage"]["status"];
type AuthConfigStatus = ReadinessResponse["checks"]["auth"]["status"];
type AuthReachability = ReadinessResponse["checks"]["auth"]["reachability"];
type OverallStatus = ReadinessResponse["status"];

type BoundedProbeResult = {
	ok: boolean;
	latencyMs: number;
};

/**
 * Race async work against `timeoutMs`; always return wall-clock `latencyMs`.
 * Timeout or throw → `ok: false` (same as probe failure).
 * `onTimeout` runs when the race timer wins (e.g. AbortController.abort for fetch).
 */
async function runBoundedProbe(
	timeoutMs: number,
	work: () => Promise<void>,
	onTimeout?: () => void,
): Promise<BoundedProbeResult> {
	const started = performance.now();
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			work(),
			new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => {
					onTimeout?.();
					reject(new Error("health probe timed out"));
				}, timeoutMs);
			}),
		]);
		return {
			ok: true,
			latencyMs: Math.round(performance.now() - started),
		};
	} catch {
		return {
			ok: false,
			latencyMs: Math.round(performance.now() - started),
		};
	} finally {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
	}
}

export function getLivenessSnapshot(now: Date = new Date()): LivenessResponse {
	return livenessResponseSchema.parse({
		status: "alive",
		timestamp: now.toISOString(),
	});
}

export function inspectDatabaseConnection(databaseUrl: string): {
	pooler: boolean;
	ssl: string;
} {
	let host = "";
	let ssl = "unknown";
	try {
		const parsed = new URL(databaseUrl);
		host = parsed.hostname;
		ssl = parsed.searchParams.get("sslmode") ?? "required";
	} catch {
		// Never echo the raw DATABASE_URL (may contain credentials).
		host = "invalid";
	}
	return {
		pooler: host.includes("-pooler"),
		ssl,
	};
}

function readAuthConfigStatus(): AuthConfigStatus {
	try {
		if (
			env.NEON_AUTH_BASE_URL.length > 0 &&
			env.NEON_AUTH_COOKIE_SECRET.length >= AUTH_COOKIE_SECRET_MIN_LENGTH
		) {
			return "configured";
		}
		return "misconfigured";
	} catch {
		return "misconfigured";
	}
}

function aggregateReadinessStatus(
	storage: StorageReachability,
	authConfig: AuthConfigStatus,
	authReachability: AuthReachability,
): OverallStatus {
	if (storage === "unreachable") {
		return "not_ready";
	}
	if (authConfig === "misconfigured") {
		return "degraded";
	}
	if (authReachability === "unreachable") {
		return "degraded";
	}
	return "ready";
}

type TimedProbe = {
	status: "reachable" | "unreachable";
	latencyMs: number;
};

/**
 * Bounded `select 1`. Exceeding `MAX_SELECT1_LATENCY_MS` loses the race →
 * `unreachable` (same as query failure). `latencyMs` is always wall-clock
 * elapsed for that attempt — not a separate SLA signal.
 */
async function probeDatabase(): Promise<TimedProbe> {
	const result = await runBoundedProbe(MAX_SELECT1_LATENCY_MS, async () => {
		await db.execute(sql`select 1`);
	});
	return {
		status: result.ok ? "reachable" : "unreachable",
		latencyMs: result.latencyMs,
	};
}

/**
 * Bounded GET against Neon Auth base URL. Any HTTP completion (incl. 4xx/5xx)
 * counts as reachable; abort/network failure → unreachable.
 * AbortController cancels the fetch when the shared timeout wins.
 */
async function probeNeonAuthBaseUrl(baseUrl: string): Promise<TimedProbe> {
	const controller = new AbortController();
	const result = await runBoundedProbe(
		AUTH_PROBE_TIMEOUT_MS,
		async () => {
			await fetch(baseUrl, {
				method: "GET",
				redirect: "manual",
				signal: controller.signal,
				cache: "no-store",
			});
		},
		() => {
			controller.abort();
		},
	);
	return {
		status: result.ok ? "reachable" : "unreachable",
		latencyMs: result.latencyMs,
	};
}

function toProbeStatus(
	reachability: "reachable" | "unreachable" | "not_probed",
): HealthProbe["status"] {
	switch (reachability) {
		case "reachable":
			return "up";
		case "unreachable":
			return "down";
		case "not_probed":
			return "skipped";
		default: {
			const _exhaustive: never = reachability;
			return _exhaustive;
		}
	}
}

export async function getReadinessSnapshot(
	now: Date = new Date(),
): Promise<ReadinessResponse> {
	const checkedAt = now.toISOString();
	const connection = inspectDatabaseConnection(env.DATABASE_URL);
	const authConfig = readAuthConfigStatus();

	const storagePromise = probeDatabase();
	const authProbePromise =
		authConfig === "configured"
			? probeNeonAuthBaseUrl(env.NEON_AUTH_BASE_URL)
			: Promise.resolve({
					status: "unreachable" as const,
					latencyMs: 0,
				});

	const [storage, authProbe] = await Promise.all([
		storagePromise,
		authProbePromise,
	]);

	const authReachability: AuthReachability =
		authConfig === "misconfigured" ? "not_probed" : authProbe.status;
	const authLatencyMs =
		authConfig === "misconfigured" ? 0 : authProbe.latencyMs;

	const probes: HealthProbe[] = [
		{
			name: "postgres",
			status: toProbeStatus(storage.status),
			critical: true,
			latencyMs: storage.latencyMs,
			checkedAt,
		},
		{
			name: "neon_auth",
			status: toProbeStatus(authReachability),
			critical: false,
			latencyMs: authLatencyMs,
			checkedAt,
		},
	];

	return readinessResponseSchema.parse({
		status: aggregateReadinessStatus(
			storage.status,
			authConfig,
			authReachability,
		),
		checks: {
			storage: {
				provider: STORAGE_PROVIDER,
				status: storage.status,
				latencyMs: storage.latencyMs,
			},
			auth: {
				provider: AUTH_PROVIDER,
				status: authConfig,
				reachability: authReachability,
				latencyMs: authLatencyMs,
			},
		},
		probes,
		topology: TOPOLOGY,
		connection,
		timestamp: checkedAt,
	});
}

/**
 * Aggregate liveness + readiness from real process / DB / Auth HTTP probes.
 */
export async function getHealthAggregate(
	now: Date = new Date(),
): Promise<HealthAggregate> {
	const liveness = getLivenessSnapshot(now);
	const readiness = await getReadinessSnapshot(now);
	return healthAggregateSchema.parse({ liveness, readiness });
}
