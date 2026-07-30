import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Platform shared Zod primitives + boundary `parseSchema` (API-004 · API-001).
 * Product schemas stay in each modules context schemas folder; adapters import these helpers.
 */

export const uuidSchema = z.uuid();

export const emailSchema = z
	.string()
	.trim()
	.pipe(z.email())
	.transform((value) => value.toLowerCase());

export interface ParseSchemaSuccess<T> {
	data: T;
	success: true;
}

export interface ParseSchemaFailure {
	details: {
		formErrors: string[];
		fieldErrors: Record<string, string[] | undefined>;
	};
	error: string;
	success: false;
}

export type ParseSchemaResult<T> = ParseSchemaSuccess<T> | ParseSchemaFailure;

/**
 * Safe-parse at the adapter boundary. Never re-validate the same shape in domain.
 */
export function parseSchema<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
): ParseSchemaResult<z.infer<TSchema>> {
	const result = schema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}

	return {
		success: false,
		error: "Invalid input.",
		details: z.flattenError(result.error),
	};
}
