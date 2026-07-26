import { fail, ok } from "@afenda/errors/result";
import type { DocumentObjectResolverPort } from "@afenda/human-resources";

export function createHumanResourcesDocumentObjectResolverPort(): DocumentObjectResolverPort {
	return {
		async assertObjectAcceptable(input) {
			if (input.validated.organizationId !== input.organizationId) {
				return fail(
					"FORBIDDEN",
					"Document reference belongs to another organization.",
				);
			}
			if (input.validated.version === null) {
				return fail(
					"BAD_REQUEST",
					"Human Resources requires immutable document object references.",
				);
			}
			if (input.reference !== input.validated.reference) {
				return fail("BAD_REQUEST", "Document reference must be canonical.");
			}
			return ok(undefined);
		},
	};
}
