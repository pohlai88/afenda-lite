import { db, sql } from "@afenda/db";
import { env, MAX_SELECT1_LATENCY_MS } from "@afenda/env";

import {
	type LivenessResponse,
	livenessResponseSchema,
	type ReadinessResponse,
	readinessResponseSchema,
} from "@/modules/platform/schemas/health";

/**
 * Platform health probes — public api-now (REST-001 · ARCH-023 · PL-S8).
 * Liveness: process-up only. Readiness: bounded DB + auth config (not reachability).
 */

const TOPOLOGY = "neon-shared-schema" as const;
const STORAGE_PROVIDER = "postgres" as const;
const AUTH_PROVIDER = "neon_auth" as const;
const AUTH_COOKIE_SECRET_MIN_LENGTH = 32;

type StorageReachability = ReadinessResponse["checks"]["storage"]["status"];
type AuthConfigStatus = ReadinessResponse["checks"]["auth"]["status"];
type OverallStatus = ReadinessResponse["status"];

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
	auth: AuthConfigStatus,
): OverallStatus {
	if (storage === "unreachable") {
		return "not_ready";
	}
	switch (auth) {
		case "misconfigured":
			return "degraded";
		case "configured":
			return "ready";
		default: {
			const _exhaustive: never = auth;
			return _exhaustive;
		}
	}
}

async function probeDatabase(): Promise<StorageReachability> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			db.execute(sql`select 1`),
			new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(new Error("select 1 timed out"));
				}, MAX_SELECT1_LATENCY_MS);
			}),
		]);
		return "reachable";
	} catch {
		return "unreachable";
	} finally {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
	}
}

export async function getReadinessSnapshot(
	now: Date = new Date(),
): Promise<ReadinessResponse> {
	const connection = inspectDatabaseConnection(env.DATABASE_URL);
	const storageStatus = await probeDatabase();
	const authStatus = readAuthConfigStatus();

	return readinessResponseSchema.parse({
		status: aggregateReadinessStatus(storageStatus, authStatus),
		checks: {
			storage: {
				provider: STORAGE_PROVIDER,
				status: storageStatus,
			},
			auth: {
				provider: AUTH_PROVIDER,
				status: authStatus,
			},
		},
		topology: TOPOLOGY,
		connection,
		timestamp: now.toISOString(),
	});
}
