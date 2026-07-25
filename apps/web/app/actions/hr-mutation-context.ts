import { z } from "zod";

export const hrMutationContextSchema = z.object({
	correlationId: z.string().trim().min(1).max(128).optional(),
});

/** Package mutation schemas include server-stamped fields — omit at the Action boundary. */
export const hrServerContextOmit = {
	organizationId: true,
	actorUserId: true,
	correlationId: true,
} as const;

const hrActionValidationStub = {
	organizationId: "00000000-0000-4000-8000-000000000001",
	actorUserId: "00000000-0000-4000-8000-000000000002",
	correlationId: "stub-hr-action-validation",
} as const;

function hrActionSchemaFromRefinedPackageSchema(schema: z.ZodTypeAny) {
	return hrMutationContextSchema.superRefine((actionInput, ctx) => {
		const result = schema.safeParse({
			...actionInput,
			organizationId: hrActionValidationStub.organizationId,
			actorUserId: hrActionValidationStub.actorUserId,
			correlationId:
				typeof actionInput.correlationId === "string"
					? actionInput.correlationId
					: hrActionValidationStub.correlationId,
		});
		if (!result.success) {
			for (const issue of result.error.issues) {
				const path0 = issue.path[0];
				if (path0 === "organizationId" || path0 === "actorUserId") {
					continue;
				}
				ctx.addIssue({
					code: "custom",
					message: issue.message,
					path: issue.path,
				});
			}
		}
	});
}

export function hrActionSchema(schema: z.ZodTypeAny) {
	if (schema instanceof z.ZodObject) {
		try {
			return hrMutationContextSchema.merge(schema.omit(hrServerContextOmit));
		} catch {
			return hrActionSchemaFromRefinedPackageSchema(schema);
		}
	}
	return hrActionSchemaFromRefinedPackageSchema(schema);
}

export function withHrSessionContext<T extends Record<string, unknown>>(
	session: { orgId: string; userId: string },
	correlationId: string,
	data: T,
) {
	return {
		organizationId: session.orgId,
		actorUserId: session.userId,
		correlationId: data.correlationId ?? correlationId,
		...data,
	};
}
