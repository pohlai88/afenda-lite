import { z } from "zod";

export const identity = {
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
};
export const mutation = {
	...identity,
	correlationId: z.string().trim().min(1),
	idempotencyKey: z.string().trim().min(1).max(128),
};
export const uuid = z.string().uuid();
export const money = z
	.union([
		z.number().positive().finite(),
		z
			.string()
			.trim()
			.regex(/^\d+(?:\.\d{1,6})?$/),
	])
	.transform(String);
export const currencyCode = z
	.string()
	.trim()
	.length(3)
	.transform((value) => value.toUpperCase());
export const code = z.string().trim().min(1).max(64);
