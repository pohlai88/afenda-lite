import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	type DocumentKind,
	type DocumentReferencePort,
	HUMAN_RESOURCES_DOCUMENT_KINDS,
	type ValidatedDocumentReference,
} from "../ports";

const MAX_DOCUMENT_REF_LENGTH = 2048;
const DOCUMENT_KIND_SET = new Set<string>(HUMAN_RESOURCES_DOCUMENT_KINDS);

function isDocumentKind(value: string): value is DocumentKind {
	return DOCUMENT_KIND_SET.has(value);
}

/**
 * Test-only document reference port.
 * Enforces the canonical organization-scoped vault reference contract.
 */
export function createMemoryDocumentReferencePort(): DocumentReferencePort {
	return {
		async validateReference(
			input,
		): Promise<Result<ValidatedDocumentReference>> {
			const trimmed = input.reference.trim();
			if (trimmed.length === 0) {
				return fail(
					"VALIDATION_ERROR",
					"Document reference is required.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}
			if (trimmed.length > MAX_DOCUMENT_REF_LENGTH) {
				return fail(
					"VALIDATION_ERROR",
					"Document reference exceeds maximum length.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}
			const lower = trimmed.toLowerCase();
			if (lower.startsWith("data:")) {
				return fail(
					"VALIDATION_ERROR",
					"Embedded document content is not allowed.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			const canonicalPrefix = `vault://organizations/${input.organizationId}/`;
			if (trimmed.startsWith(canonicalPrefix)) {
				const rest = trimmed.slice(canonicalPrefix.length);
				const [kindAndId = "", query = ""] = rest.split("?");
				const [kindRaw = "", documentId = ""] = kindAndId.split("/");
				if (!isDocumentKind(kindRaw) || documentId.length === 0) {
					return fail(
						"VALIDATION_ERROR",
						"Document reference is malformed.",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
					);
				}
				if (
					input.allowedKinds !== undefined &&
					!input.allowedKinds.includes(kindRaw)
				) {
					return fail(
						"VALIDATION_ERROR",
						`Document kind "${kindRaw}" is not allowed for this command.`,
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
					);
				}
				const params = new URLSearchParams(query);
				const version = params.get("version");
				if (input.requireImmutableVersion === true && version === null) {
					return fail(
						"VALIDATION_ERROR",
						"An immutable document version is required.",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
					);
				}
				return ok({
					reference: trimmed,
					organizationId: input.organizationId,
					documentKind: kindRaw,
					documentId,
					version,
				});
			}

			return fail(
				"VALIDATION_ERROR",
				"Document reference must match vault://organizations/{organizationId}/{documentKind}/{documentId}.",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		},
	};
}
