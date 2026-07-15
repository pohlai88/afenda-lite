import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Health probe response shapes (REST-001 api-now · OPEN-001).
 */

export const livenessResponseSchema = z.object({
	status: z.literal("alive"),
	timestamp: z.string().datetime(),
});

export type LivenessResponse = z.infer<typeof livenessResponseSchema>;

export const readinessResponseSchema = z.object({
	status: z.enum(["ready", "degraded"]),
	topology: z.string().min(1),
	storage: z.string().min(1),
	connection: z.object({
		pooler: z.boolean(),
		ssl: z.string().min(1),
	}),
	auth: z.enum(["configured", "missing", "degraded"]),
	timestamp: z.string().datetime(),
});

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
