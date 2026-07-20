import { writeFileSync } from "node:fs";
import { stringify as stringifyYaml } from "yaml";

import { z } from "./zod";

/** Living OPEN-001 OpenAPI version (Fumadocs + Spectral). */
export const OPENAPI_VERSION = "3.0.3" as const;

/**
 * OAS extension id for `x-afenda-document.id`.
 * Not the Fumadocs SchemaRecord key in `@afenda/docs` (that package uses a path string under the same symbol name).
 */
export const OPENAPI_DOCUMENT_ID = "OPEN-001" as const;

export type AfendaOperationStatus = "api-now" | "contract-only";

export type OpenApiHttpMethod =
	| "get"
	| "post"
	| "put"
	| "patch"
	| "delete"
	| "head"
	| "options";

export type OperationMetadata = {
	operationId: string;
	status: AfendaOperationStatus;
};

/** path → HTTP method → Afenda op metadata */
export type OperationMetadataMap = Readonly<
	Partial<
		Record<
			string,
			Readonly<Partial<Record<OpenApiHttpMethod, OperationMetadata>>>
		>
	>
>;

export type AfendaDocumentMeta = {
	id: string;
	version: string;
	generatedAt: string;
};

type OpenApiOperation = Record<string, unknown>;

type OpenApiPathItem = Partial<
	Record<OpenApiHttpMethod, OpenApiOperation | undefined>
> & {
	[key: string]: OpenApiOperation | undefined;
};

export type StampableOpenApiDocument = {
	paths?: Record<string, OpenApiPathItem | undefined>;
	[key: string]: unknown;
};

function isOpenApiHttpMethod(value: string): value is OpenApiHttpMethod {
	switch (value) {
		case "get":
		case "post":
		case "put":
		case "patch":
		case "delete":
		case "head":
		case "options":
			return true;
		default:
			return false;
	}
}

/**
 * Runtime success envelope from `healthJson` / `apiData` — always `{ data: T }`.
 */
export function dataEnvelope<T extends z.ZodType>(inner: T, name: string) {
	return z.object({ data: inner }).openapi(name);
}

/**
 * Stamp `operationId` + `x-afenda-status` onto generated path operations.
 * Throws when a metadata entry has no matching generated operation.
 */
export function stampOperationMetadata(
	document: StampableOpenApiDocument,
	metadata: OperationMetadataMap,
): void {
	for (const [route, methods] of Object.entries(metadata)) {
		if (!methods) continue;
		for (const [method, opMeta] of Object.entries(methods)) {
			if (!opMeta || !isOpenApiHttpMethod(method)) {
				throw new Error(
					`Invalid OpenAPI method metadata ${method.toUpperCase()} ${route}`,
				);
			}
			const pathItem = document.paths?.[route];
			const operation = pathItem?.[method];
			if (!operation || typeof operation !== "object") {
				throw new Error(
					`Missing generated operation ${method.toUpperCase()} ${route}`,
				);
			}
			operation.operationId = opMeta.operationId;
			operation["x-afenda-status"] = opMeta.status;
		}
	}
}

/** Attach `x-afenda-document` extension on the OAS root. */
export function stampAfendaDocument(
	document: StampableOpenApiDocument,
	meta: AfendaDocumentMeta,
): void {
	document["x-afenda-document"] = { ...meta };
}

/**
 * Serialize an OpenAPI document to YAML with a leading comment header.
 * Deep-clones via JSON so Zod-to-OpenAPI class instances stringify cleanly.
 */
export function formatOpenApiYaml(
	document: unknown,
	headerLines: readonly string[],
): string {
	const joined = headerLines.length > 0 ? headerLines.join("\n") : "";
	const header =
		joined.length > 0 && !joined.endsWith("\n") ? `${joined}\n` : joined;
	const body = stringifyYaml(JSON.parse(JSON.stringify(document)), {
		lineWidth: 100,
		aliasDuplicateObjects: false,
	});
	return `${header}${body}\n`;
}

/** Write generator YAML to disk (UTF-8). */
export function writeOpenApiYaml(
	outPath: string,
	document: unknown,
	headerLines: readonly string[],
): void {
	writeFileSync(outPath, formatOpenApiYaml(document, headerLines), "utf8");
}
