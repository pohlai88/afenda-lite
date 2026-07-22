import { fail, ok, type Result } from "@afenda/errors/result";

import type { DocumentReferencePort } from "./ports";

const MAX_DOCUMENT_REF_LENGTH = 2048;

export function createDefaultDocumentReferencePort(): DocumentReferencePort {
	return {
		async assertAcceptableRef(ref: string): Promise<Result<void>> {
			const trimmed = ref.trim();
			if (trimmed.length === 0) {
				return fail("VALIDATION_ERROR", "Document reference is required.");
			}
			if (trimmed.length > MAX_DOCUMENT_REF_LENGTH) {
				return fail(
					"VALIDATION_ERROR",
					"Document reference exceeds maximum length.",
				);
			}
			const lower = trimmed.toLowerCase();
			if (lower.startsWith("data:")) {
				return fail(
					"VALIDATION_ERROR",
					"Embedded document content is not allowed.",
				);
			}
			return ok(undefined);
		},
	};
}
