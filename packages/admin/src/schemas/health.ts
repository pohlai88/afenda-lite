import { z } from "zod";

export const livenessResponseSchema = z.object({
	status: z.literal("alive"),
	timestamp: z.string().datetime(),
});

export type LivenessResponse = z.infer<typeof livenessResponseSchema>;

const readinessStorageCheckSchema = z.object({
	provider: z.literal("postgres"),
	status: z.enum(["reachable", "unreachable"]),
	/** Wall-clock ms for the bounded `select 1` probe (measured fact). */
	latencyMs: z.number().int().min(0),
});

const readinessAuthCheckSchema = z.object({
	provider: z.literal("neon_auth"),
	/** Env/config gate — checked before any network probe. */
	status: z.enum(["configured", "misconfigured"]),
	/**
	 * HTTP reachability of `NEON_AUTH_BASE_URL`.
	 * `not_probed` when config is incomplete (cheap fail before fetch).
	 */
	reachability: z.enum(["reachable", "unreachable", "not_probed"]),
	/** Wall-clock ms for the bounded Auth base-URL probe (0 when not_probed). */
	latencyMs: z.number().int().min(0),
});

	const healthProbeSchema = z.object({
	name: z.enum(["postgres", "neon_auth"]),
	status: z.enum(["up", "down", "skipped"]),
	/**
	 * Critical probe failure → overall `not_ready`; non-critical → `degraded`.
	 * postgres is critical; neon_auth is not.
	 */
	critical: z.boolean(),
	latencyMs: z.number().int().min(0),
	checkedAt: z.string().datetime(),
});

export type HealthProbe = z.infer<typeof healthProbeSchema>;

export const readinessResponseSchema = z.object({
	status: z.enum(["ready", "degraded", "not_ready"]),
	checks: z.object({
		storage: readinessStorageCheckSchema,
		auth: readinessAuthCheckSchema,
	}),
	/** Explicit multi-probe fan-out — real targets only (no invented deps). */
	probes: z.array(healthProbeSchema).min(1),
	topology: z.literal("neon-shared-schema"),
	connection: z.object({
		pooler: z.boolean(),
		ssl: z.string().min(1),
	}),
	timestamp: z.string().datetime(),
});

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;

export const healthAggregateSchema = z.object({
	liveness: livenessResponseSchema,
	readiness: readinessResponseSchema,
});

export type HealthAggregate = z.infer<typeof healthAggregateSchema>;
