import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	type DocumentKind,
	type DocumentObjectResolverPort,
	type DocumentReferencePort,
	HUMAN_RESOURCES_DOCUMENT_KINDS,
	type ValidatedDocumentReference,
} from "../../kernel/execution/ports";

const DOCUMENT_KIND_SET = new Set<string>(HUMAN_RESOURCES_DOCUMENT_KINDS);

const VAULT_PATH_PATTERN =
	/^\/organizations\/([^/]+)\/([^/]+)\/([^/?#]+)(?:\?([^#]*))?$/;
const UNSAFE_PATH_SEGMENT_PATTERN = /[/?#\\]/u;
const LEADING_QUERY_MARKER_PATTERN = /^\?/;

function isDocumentKind(value: string): value is DocumentKind {
	return DOCUMENT_KIND_SET.has(value);
}

function isSafePathSegment(value: string): boolean {
	if (value.length === 0 || UNSAFE_PATH_SEGMENT_PATTERN.test(value)) {
		return false;
	}
	return !Array.from(value).some((character) => {
		const codePoint = character.codePointAt(0);
		return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
	});
}

function parseQuery(query: string | undefined): {
	version: string | null;
	checksum: string | null;
} {
	if (query === undefined || query.length === 0) {
		return { version: null, checksum: null };
	}
	const params = new URLSearchParams(query);
	const version = params.get("version");
	const checksum = params.get("checksum");
	return {
		version:
			version !== null && version.trim().length > 0 ? version.trim() : null,
		checksum:
			checksum !== null && checksum.trim().length > 0 ? checksum.trim() : null,
	};
}

function normalizeCanonicalReference(input: {
	organizationId: string;
	documentKind: DocumentKind;
	documentId: string;
	version: string | null;
	checksum: string | null;
}): string {
	const base = `vault://organizations/${input.organizationId}/${input.documentKind}/${input.documentId}`;
	const params = new URLSearchParams();
	if (input.version !== null) {
		params.set("version", input.version);
	}
	if (input.checksum !== null) {
		params.set("checksum", input.checksum);
	}
	const query = params.toString();
	return query.length > 0 ? `${base}?${query}` : base;
}

function parseVaultReference(reference: string): Result<{
	organizationId: string;
	documentKind: DocumentKind;
	documentId: string;
	version: string | null;
	checksum: string | null;
}> {
	const trimmed = reference.trim();
	if (trimmed.length === 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	const lower = trimmed.toLowerCase();
	if (lower.startsWith("data:")) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	if (!lower.startsWith("vault://")) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	if (url.protocol !== "vault:") {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	// URL parser: vault://organizations/org/kind/id → host=organizations, pathname=/org/kind/id
	// Prefer reconstructing path as /organizations/{rest}
	let pathFromHost = url.pathname;
	if (url.host.length > 0) {
		pathFromHost = `/${url.host}${url.pathname}`;
	} else if (!pathFromHost.startsWith("/")) {
		pathFromHost = `/${pathFromHost}`;
	}

	const match = VAULT_PATH_PATTERN.exec(pathFromHost);
	if (match === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	const organizationId = decodeURIComponent(match[1] ?? "");
	const kindRaw = decodeURIComponent(match[2] ?? "");
	const documentId = decodeURIComponent(match[3] ?? "");
	const query =
		match[4] ?? url.search.replace(LEADING_QUERY_MARKER_PATTERN, "");

	if (
		!(
			isSafePathSegment(organizationId) &&
			isSafePathSegment(kindRaw) &&
			isSafePathSegment(documentId)
		)
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	if (!isDocumentKind(kindRaw)) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	const { version, checksum } = parseQuery(query);
	return errorResult.ok({
		organizationId,
		documentKind: kindRaw,
		documentId,
		version,
		checksum,
	});
}

export interface VaultDocumentReferenceAdapterDeps {
	resolver?: DocumentObjectResolverPort;
}

export function createVaultDocumentReferenceAdapter(
	deps: VaultDocumentReferenceAdapterDeps = {},
): DocumentReferencePort {
	const { resolver } = deps;

	return {
		async validateReference(
			input,
		): Promise<Result<ValidatedDocumentReference>> {
			const parsed = parseVaultReference(input.reference);
			if (!parsed.ok) {
				return parsed;
			}

			if (parsed.data.organizationId !== input.organizationId) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
			}

			if (
				input.allowedKinds !== undefined &&
				!input.allowedKinds.includes(parsed.data.documentKind)
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
			}

			if (
				input.requireImmutableVersion === true &&
				parsed.data.version === null
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
			}

			const reference = normalizeCanonicalReference({
				organizationId: parsed.data.organizationId,
				documentKind: parsed.data.documentKind,
				documentId: parsed.data.documentId,
				version: parsed.data.version,
				checksum: parsed.data.checksum,
			});

			const validated: ValidatedDocumentReference = {
				reference,
				organizationId: parsed.data.organizationId,
				documentKind: parsed.data.documentKind,
				documentId: parsed.data.documentId,
				version: parsed.data.version,
			};

			if (resolver !== undefined) {
				const resolved = await resolver.assertObjectAcceptable({
					organizationId: input.organizationId,
					reference,
					validated,
				});
				if (!resolved.ok) {
					return resolved;
				}
			}

			return errorResult.ok(validated);
		},
	};
}
