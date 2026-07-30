import { fail, ok } from "@afenda/errors/result";
import type { DocumentObjectResolverPort } from "@afenda/human-resources";

export function createHumanResourcesDocumentObjectResolverPort(): DocumentObjectResolverPort {
	return {
		async assertObjectAcceptable(input) {
			if (input.validated.organizationId !== input.organizationId) {
				return await fail(
					"FORBIDDEN",
					"Document reference belongs to another organization.",
				);
			}
			if (input.validated.version === null) {
				return await fail(
					"BAD_REQUEST",
					"Human Resources requires immutable document object references.",
				);
			}
			if (input.reference !== input.validated.reference) {
				return await fail(
					"BAD_REQUEST",
					"Document reference must be canonical.",
				);
			}
			return await ok(undefined);
		},
	};
}
