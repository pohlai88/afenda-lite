import { z } from "zod";

export const identity = {
	actorUserId: z.string().trim().min(1),
	organizationId: z.string().trim().min(1),
};
export const correlated = {
	...identity,
	correlationId: z.string().trim().min(1),
};
export const uuid = z.string().uuid();
export const positiveDecimal = z
	.union([z.number().positive(), z.string().trim().min(1)])
	.transform((value, ctx) => {
		const number = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(number) || number <= 0) {
			ctx.addIssue({ code: "custom", message: "Amount must be positive" });
			return z.NEVER;
		}
		return String(number);
	});
export const currencyCode = z
	.string()
	.trim()
	.length(3)
	.transform((value) => value.toUpperCase());
export const documentCreateSchema = z.object({
	...correlated,
	code: z.string().trim().min(1).max(64),
	currencyCode,
	supplierCode: z.string().trim().min(1).max(64),
	supplierId: uuid,
	supplierName: z.string().trim().min(1).max(256),
});
