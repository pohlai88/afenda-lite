import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Health probe response shapes (REST-001 api-now · OPEN-001 · PL-S8).
 */

export const livenessResponseSchema = z.object({
	status: z.literal("alive"),
	timestamp: z.string().datetime(),
});

export type LivenessResponse = z.infer<typeof livenessResponseSchema>;

const readinessStorageCheckSchema = z.object({
	provider: z.literal("postgres"),
	status: z.enum(["reachable", "unreachable"]),
});

const readinessAuthCheckSchema = z.object({
	provider: z.literal("neon_auth"),
	status: z.enum(["configured", "misconfigured"]),
});

export const readinessResponseSchema = z.object({
	status: z.enum(["ready", "degraded", "not_ready"]),
	checks: z.object({
		storage: readinessStorageCheckSchema,
		auth: readinessAuthCheckSchema,
	}),
	topology: z.literal("neon-shared-schema"),
	connection: z.object({
		pooler: z.boolean(),
		ssl: z.string().min(1),
	}),
	timestamp: z.string().datetime(),
});

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
