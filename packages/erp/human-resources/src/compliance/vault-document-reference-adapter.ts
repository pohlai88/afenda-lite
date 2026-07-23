import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	type DocumentKind,
	type DocumentObjectResolverPort,
	type DocumentReferencePort,
	HUMAN_RESOURCES_DOCUMENT_KINDS,
	type ValidatedDocumentReference,
} from "../ports";

const DOCUMENT_KIND_SET = new Set<string>(HUMAN_RESOURCES_DOCUMENT_KINDS);

const VAULT_PATH_PATTERN =
	/^\/organizations\/([^/]+)\/([^/]+)\/([^/?#]+)(?:\?([^#]*))?$/;

function isDocumentKind(value: string): value is DocumentKind {
	return DOCUMENT_KIND_SET.has(value);
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
		version: version !== null && version.trim().length > 0 ? version.trim() : null,
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

function parseVaultReference(
	reference: string,
): Result<{
	organizationId: string;
	documentKind: DocumentKind;
	documentId: string;
	version: string | null;
	checksum: string | null;
}> {
	const trimmed = reference.trim();
	if (trimmed.length === 0) {
		return fail(
			"VALIDATION_ERROR",
			"Document reference is required.",
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
	if (!lower.startsWith("vault://")) {
		return fail(
			"VALIDATION_ERROR",
			"Document reference must use the vault:// scheme.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return fail(
			"VALIDATION_ERROR",
			"Document reference is malformed.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	if (url.protocol !== "vault:") {
		return fail(
			"VALIDATION_ERROR",
			"Document reference must use the vault:// scheme.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	// URL parser: vault://organizations/org/kind/id → host=organizations, pathname=/org/kind/id
	// Prefer reconstructing path as /organizations/{rest}
	const pathFromHost =
		url.host.length > 0
			? `/${url.host}${url.pathname}`
			: url.pathname.startsWith("/")
				? url.pathname
				: `/${url.pathname}`;

	const match = VAULT_PATH_PATTERN.exec(pathFromHost);
	if (match === null) {
		return fail(
			"VALIDATION_ERROR",
			"Document reference must match vault://organizations/{organizationId}/{documentKind}/{documentId}.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	const organizationId = decodeURIComponent(match[1] ?? "");
	const kindRaw = decodeURIComponent(match[2] ?? "");
	const documentId = decodeURIComponent(match[3] ?? "");
	const query = match[4] ?? url.search.replace(/^\?/, "");

	if (
		organizationId.length === 0 ||
		kindRaw.length === 0 ||
		documentId.length === 0
	) {
		return fail(
			"VALIDATION_ERROR",
			"Document reference path segments must be non-empty.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	if (!isDocumentKind(kindRaw)) {
		return fail(
			"VALIDATION_ERROR",
			`Document kind "${kindRaw}" is not supported.`,
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	const { version, checksum } = parseQuery(query);
	return ok({
		organizationId,
		documentKind: kindRaw,
		documentId,
		version,
		checksum,
	});
}

export type VaultDocumentReferenceAdapterDeps = {
	resolver?: DocumentObjectResolverPort;
};

export function createVaultDocumentReferenceAdapter(
	deps: VaultDocumentReferenceAdapterDeps = {},
): DocumentReferencePort {
	const resolver = deps.resolver;

	return {
		async validateReference(input): Promise<Result<ValidatedDocumentReference>> {
			const parsed = parseVaultReference(input.reference);
			if (!parsed.ok) {
				return parsed;
			}

			if (parsed.data.organizationId !== input.organizationId) {
				return fail(
					"VALIDATION_ERROR",
					"Document reference organization does not match the command organization.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			if (
				input.allowedKinds !== undefined &&
				!input.allowedKinds.includes(parsed.data.documentKind)
			) {
				return fail(
					"VALIDATION_ERROR",
					`Document kind "${parsed.data.documentKind}" is not allowed for this command.`,
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			if (
				input.requireImmutableVersion === true &&
				parsed.data.version === null
			) {
				return fail(
					"VALIDATION_ERROR",
					"An immutable document version is required.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
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

			return ok(validated);
		},
	};
}
