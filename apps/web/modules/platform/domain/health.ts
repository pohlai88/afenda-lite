import { db, sql } from "@afenda/db";
import { env } from "@afenda/env";

import type {
	LivenessResponse,
	ReadinessResponse,
} from "@/modules/platform/schemas/health";

/**
 * Platform health probes — public api-now (REST-001 · ARCH-023 shared schema).
 */

export function getLivenessSnapshot(now: Date = new Date()): LivenessResponse {
	return {
		status: "alive",
		timestamp: now.toISOString(),
	};
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
		host = databaseUrl;
	}
	return {
		pooler: host.includes("-pooler"),
		ssl,
	};
}

function readAuthStatus(): ReadinessResponse["auth"] {
	try {
		if (
			env.NEON_AUTH_BASE_URL.length > 0 &&
			env.NEON_AUTH_COOKIE_SECRET.length >= 32
		) {
			return "configured";
		}
		return "missing";
	} catch {
		return "degraded";
	}
}

async function probeDatabase(): Promise<boolean> {
	try {
		await db.execute(sql`select 1`);
		return true;
	} catch {
		return false;
	}
}

export async function getReadinessSnapshot(
	now: Date = new Date(),
): Promise<ReadinessResponse> {
	const connection = inspectDatabaseConnection(env.DATABASE_URL);
	const storageOk = await probeDatabase();
	const auth = readAuthStatus();
	const degraded = !storageOk || auth !== "configured";

	return {
		status: degraded ? "degraded" : "ready",
		topology: "neon-shared-schema",
		storage: storageOk ? "postgres" : "unreachable",
		connection,
		auth,
		timestamp: now.toISOString(),
	};
}
