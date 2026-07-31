import { errorResult } from "@afenda/errors";
import type { DocumentObjectResolverPort } from "@afenda/human-resources";

export function createHumanResourcesDocumentObjectResolverPort(): DocumentObjectResolverPort {
	return {
		async assertObjectAcceptable(input) {
			if (input.validated.organizationId !== input.organizationId) {
				return await errorResult.fail("FORBIDDEN");
			}
			if (input.validated.version === null) {
				return await errorResult.fail("BAD_REQUEST", {
					publicMessage:
						"Human Resources requires immutable document object references.",
				});
			}
			if (input.reference !== input.validated.reference) {
				return await errorResult.fail("BAD_REQUEST", {
					publicMessage: "Document reference must be canonical.",
				});
			}
			return await errorResult.ok(undefined);
		},
	};
}
