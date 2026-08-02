import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../kernel/execution/error-codes";
import {
	type DocumentKind,
	type DocumentReferencePort,
	HUMAN_RESOURCES_DOCUMENT_KINDS,
	type ValidatedDocumentReference,
} from "../kernel/execution/ports";

const MAX_DOCUMENT_REF_LENGTH = 2048;
const DOCUMENT_KIND_SET = new Set<string>(HUMAN_RESOURCES_DOCUMENT_KINDS);

function isDocumentKind(value: string): value is DocumentKind {
	return DOCUMENT_KIND_SET.has(value);
}

type DocumentReferenceInput = Parameters<
	DocumentReferencePort["validateReference"]
>[0];

function invalidDocumentReference(_message: string): Result<never> {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "The submitted data is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		),
	});
}

function validateCanonicalDocumentReference(
	input: DocumentReferenceInput,
	trimmed: string,
	canonicalPrefix: string,
): Result<ValidatedDocumentReference> {
	const rest = trimmed.slice(canonicalPrefix.length);
	const [kindAndId = "", query = ""] = rest.split("?");
	const [kindRaw = "", documentId = ""] = kindAndId.split("/");
	if (!isDocumentKind(kindRaw) || documentId.length === 0) {
		return invalidDocumentReference("Document reference is malformed.");
	}
	if (
		input.allowedKinds !== undefined &&
		!input.allowedKinds.includes(kindRaw)
	) {
		return invalidDocumentReference(
			`Document kind "${kindRaw}" is not allowed for this command.`,
		);
	}

	const params = new URLSearchParams(query);
	const version = params.get("version");
	if (input.requireImmutableVersion === true && version === null) {
		return invalidDocumentReference(
			"An immutable document version is required.",
		);
	}

	return errorResult.ok({
		reference: trimmed,
		organizationId: input.organizationId,
		documentKind: kindRaw,
		documentId,
		version,
	});
}

function validateMemoryDocumentReference(
	input: DocumentReferenceInput,
): Result<ValidatedDocumentReference> {
	const trimmed = input.reference.trim();
	if (trimmed.length === 0) {
		return invalidDocumentReference("Document reference is required.");
	}
	if (trimmed.length > MAX_DOCUMENT_REF_LENGTH) {
		return invalidDocumentReference(
			"Document reference exceeds maximum length.",
		);
	}
	if (trimmed.toLowerCase().startsWith("data:")) {
		return invalidDocumentReference(
			"Embedded document content is not allowed.",
		);
	}

	const canonicalPrefix = `vault://organizations/${input.organizationId}/`;
	if (!trimmed.startsWith(canonicalPrefix)) {
		return invalidDocumentReference(
			"Document reference must match vault://organizations/{organizationId}/{documentKind}/{documentId}.",
		);
	}

	return validateCanonicalDocumentReference(input, trimmed, canonicalPrefix);
}

/**
 * Test-only document reference port.
 * Enforces the canonical organization-scoped vault reference contract.
 */
export function createMemoryDocumentReferencePort(): DocumentReferencePort {
	return {
		validateReference(input): Promise<Result<ValidatedDocumentReference>> {
			return Promise.resolve(validateMemoryDocumentReference(input));
		},
	};
}
