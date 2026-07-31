import {
	OpenAPIRegistry,
	OpenApiGeneratorV3,
	type RouteConfig,
} from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";

import { z } from "./zod";

/** OAS version emitted by the canonical document projection. */
export const OPENAPI_VERSION = "3.0.3" as const;

/** Afenda document identity stamped on every generated document. */
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

export interface OperationMetadata {
	operationId: string;
	status: AfendaOperationStatus;
}

export type OperationMetadataMap = Readonly<
	Partial<
		Record<
			string,
			Readonly<Partial<Record<OpenApiHttpMethod, OperationMetadata>>>
		>
	>
>;

export interface AfendaDocumentMeta {
	generatedAt: string;
	id: typeof OPENAPI_DOCUMENT_ID;
	version: string;
}

type DocumentConfig = Parameters<OpenApiGeneratorV3["generateDocument"]>[0];
export type OpenApiDocument = ReturnType<
	OpenApiGeneratorV3["generateDocument"]
>;

interface OpenApiOperation {
	operationId?: string;
	"x-afenda-status"?: AfendaOperationStatus;
}

type OpenApiPathItem = Partial<
	Record<OpenApiHttpMethod, OpenApiOperation | undefined>
>;

interface StampableOpenApiDocument {
	paths?: Record<string, OpenApiPathItem | undefined>;
	"x-afenda-document"?: AfendaDocumentMeta;
}

export type SecurityScheme =
	| Readonly<{
			description?: string;
			in: "cookie" | "header" | "query";
			name: string;
			type: "apiKey";
	  }>
	| Readonly<{
			bearerFormat?: string;
			description?: string;
			scheme: string;
			type: "http";
	  }>;

export interface GenerateDocumentInput {
	config: DocumentConfig;
	meta: AfendaDocumentMeta;
	operations: OperationMetadataMap;
}

function isOpenApiHttpMethod(value: string): value is OpenApiHttpMethod {
	return (
		value === "get" ||
		value === "post" ||
		value === "put" ||
		value === "patch" ||
		value === "delete" ||
		value === "head" ||
		value === "options"
	);
}

function stampOperations(
	document: StampableOpenApiDocument,
	metadata: OperationMetadataMap,
): void {
	for (const [route, methods] of Object.entries(metadata)) {
		if (!methods) {
			continue;
		}
		for (const [method, operationMetadata] of Object.entries(methods)) {
			if (!(operationMetadata && isOpenApiHttpMethod(method))) {
				throw new Error(
					`Invalid OpenAPI method metadata ${method.toUpperCase()} ${route}`,
				);
			}
			const operation = document.paths?.[route]?.[method];
			if (!operation || typeof operation !== "object") {
				throw new Error(
					`Missing generated operation ${method.toUpperCase()} ${route}`,
				);
			}
			operation.operationId = operationMetadata.operationId;
			operation["x-afenda-status"] = operationMetadata.status;
		}
	}
}

function createRegistry() {
	const registry = new OpenAPIRegistry();
	return Object.freeze({
		document(input: GenerateDocumentInput): OpenApiDocument {
			const document = new OpenApiGeneratorV3(
				registry.definitions,
			).generateDocument(input.config);
			stampOperations(document, input.operations);
			document["x-afenda-document"] = { ...input.meta };
			return document;
		},
		path(route: RouteConfig): void {
			registry.registerPath(route);
		},
		schema<T extends ZodType>(name: string, schema: T): T {
			return registry.register(name, schema);
		},
		securityScheme(name: string, scheme: SecurityScheme): void {
			registry.registerComponent("securitySchemes", name, scheme);
		},
	});
}

function dataEnvelope<T extends ZodType>(inner: T, name: string) {
	return z.object({ data: inner }).openapi(name);
}

/** Permanent consumer facade for canonical OpenAPI construction. */
export const openapi = Object.freeze({
	document: Object.freeze({
		id: OPENAPI_DOCUMENT_ID,
		version: OPENAPI_VERSION,
	}),
	envelope: Object.freeze({ data: dataEnvelope }),
	registry: Object.freeze({ create: createRegistry }),
	schema: Object.freeze({ z }),
});
