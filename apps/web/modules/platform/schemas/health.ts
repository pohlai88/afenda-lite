import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Health probe response shapes (REST-001 api-now · OPEN-001 · PL-S8).
 * Wire/OpenAPI SSOT for generate-openapi; runtime probe parse lives in `@afenda/admin`.
 */

export const livenessResponseSchema = z.object({
	status: z.literal("alive"),
	timestamp: z.string().datetime(),
});

const readinessStorageCheckSchema = z.object({
	provider: z.literal("postgres"),
	status: z.enum(["reachable", "unreachable"]),
	/** Wall-clock ms for the bounded `select 1` probe (measured fact). */
	latencyMs: z.number().int().min(0).openapi({
		description:
			"Wall-clock milliseconds for the bounded select 1 probe. Timeout at MAX_SELECT1_LATENCY_MS already yields status unreachable; latencyMs remains the measured elapsed time.",
	}),
});

const readinessAuthCheckSchema = z.object({
	provider: z.literal("neon_auth"),
	status: z.enum(["configured", "misconfigured"]),
	reachability: z.enum(["reachable", "unreachable", "not_probed"]).openapi({
		description:
			"HTTP reachability of NEON_AUTH_BASE_URL. not_probed when auth env/config is incomplete (cheap fail before fetch).",
	}),
	latencyMs: z.number().int().min(0).openapi({
		description:
			"Wall-clock milliseconds for the bounded Neon Auth base-URL probe. 0 when reachability is not_probed.",
	}),
});

	const healthProbeSchema = z.object({
	name: z.enum(["postgres", "neon_auth"]),
	status: z.enum(["up", "down", "skipped"]),
	critical: z.boolean().openapi({
		description:
			"Critical probe failure → overall not_ready; non-critical → degraded. postgres is critical; neon_auth is not.",
	}),
	latencyMs: z.number().int().min(0),
	checkedAt: z.string().datetime(),
});

export const readinessResponseSchema = z.object({
	status: z.enum(["ready", "degraded", "not_ready"]),
	checks: z.object({
		storage: readinessStorageCheckSchema,
		auth: readinessAuthCheckSchema,
	}),
	probes: z.array(healthProbeSchema).min(1).openapi({
		description:
			"Real multi-probe fan-out (postgres select 1 + Neon Auth HTTP). No invented NATS/Redis/port fleet.",
	}),
	topology: z.literal("neon-shared-schema"),
	connection: z.object({
		pooler: z.boolean(),
		ssl: z.string().min(1),
	}),
	timestamp: z.string().datetime(),
});
