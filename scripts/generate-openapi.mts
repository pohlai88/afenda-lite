/**
 * Emit docs/api/OPEN-001-openapi.yaml for api-now HTTP only.
 *
 * Zod SSOT: apps/web/modules platform + declarations schemas (OPEN-001 Zod handoff).
 * Run with: pnpm exec tsx --tsconfig apps/web/tsconfig.json scripts/generate-openapi.mts
 *
 * @see docs/api/OPEN-001-openapi.md
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	OpenAPIRegistry,
	OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { stringify as stringifyYaml } from "yaml";

import {
	declarationDraftGetResponseSchema,
	declarationDraftQuerySchema,
	declarationDraftWriteResponseSchema,
	saveClientDeclarationDraftSchema,
} from "../apps/web/modules/declarations/schemas/client";
import { apiErrorBodySchema } from "../apps/web/modules/platform/schemas/api-error";
import {
	livenessResponseSchema,
	readinessResponseSchema,
} from "../apps/web/modules/platform/schemas/health";
import { z } from "../apps/web/modules/platform/schemas/openapi-zod";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = join("docs", "api", "OPEN-001-openapi.yaml");
const outPath = process.env.OPENAPI_OUT
	? process.env.OPENAPI_OUT
	: join(root, OUT_REL);

/** Runtime success envelope from `healthJson` / `apiData` — always `{ data: T }`. */
function dataEnvelope<T extends z.ZodTypeAny>(inner: T, name: string) {
	return z.object({ data: inner }).openapi(name);
}

const livenessEnvelopeSchema = dataEnvelope(
	livenessResponseSchema,
	"LivenessEnvelope",
);
const readinessEnvelopeSchema = dataEnvelope(
	readinessResponseSchema,
	"ReadinessEnvelope",
);
const declarationDraftGetEnvelopeSchema = dataEnvelope(
	declarationDraftGetResponseSchema,
	"DeclarationDraftGetEnvelope",
);
const declarationDraftWriteEnvelopeSchema = dataEnvelope(
	declarationDraftWriteResponseSchema,
	"DeclarationDraftWriteEnvelope",
);

const registry = new OpenAPIRegistry();

registry.register("APIErrorBody", apiErrorBodySchema);
registry.register("LivenessResponse", livenessResponseSchema);
registry.register("ReadinessResponse", readinessResponseSchema);
registry.register(
	"SaveClientDeclarationDraft",
	saveClientDeclarationDraftSchema,
);
registry.register(
	"DeclarationDraftGetResponse",
	declarationDraftGetResponseSchema,
);
registry.register(
	"DeclarationDraftWriteResponse",
	declarationDraftWriteResponseSchema,
);
registry.register("LivenessEnvelope", livenessEnvelopeSchema);
registry.register("ReadinessEnvelope", readinessEnvelopeSchema);
registry.register(
	"DeclarationDraftGetEnvelope",
	declarationDraftGetEnvelopeSchema,
);
registry.register(
	"DeclarationDraftWriteEnvelope",
	declarationDraftWriteEnvelopeSchema,
);

registry.registerComponent("securitySchemes", "neonAuthSession", {
	type: "apiKey",
	in: "cookie",
	name: "session",
	description:
		"Neon Auth client session cookie (browser same-origin). Cookie name here is illustrative — Neon owns the real name.",
});

const errorResponses = {
	400: {
		description: "Bad request",
		content: {
			"application/json": { schema: apiErrorBodySchema },
		},
	},
	401: {
		description: "Unauthorized",
		content: {
			"application/json": { schema: apiErrorBodySchema },
		},
	},
	403: {
		description: "Forbidden",
		content: {
			"application/json": { schema: apiErrorBodySchema },
		},
	},
	404: {
		description: "Not found",
		content: {
			"application/json": { schema: apiErrorBodySchema },
		},
	},
	422: {
		description: "Validation error",
		content: {
			"application/json": { schema: apiErrorBodySchema },
		},
	},
} as const;

registry.registerPath({
	method: "get",
	path: "/api/health/liveness",
	summary: "Process liveness probe",
	description: "Public process-up check. Optional short public CDN cache.",
	tags: ["Health"],
	responses: {
		200: {
			description: "Process is alive",
			content: {
				"application/json": { schema: livenessEnvelopeSchema },
			},
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/health/readiness",
	summary: "Dependency readiness probe",
	description: "DB / auth dependency snapshot. Prefer Cache-Control: no-store.",
	tags: ["Health"],
	responses: {
		200: {
			description: "Ready or degraded snapshot",
			content: {
				"application/json": { schema: readinessEnvelopeSchema },
			},
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/client/declaration-draft",
	summary: "Load client declaration draft",
	description:
		"Requires client session + onboarding. Cache-Control: private, no-store. Success body uses `{ data }` envelope.",
	tags: ["DeclarationDraft"],
	security: [{ neonAuthSession: [] }],
	request: {
		query: declarationDraftQuerySchema,
	},
	responses: {
		200: {
			description: "Draft loaded",
			content: {
				"application/json": { schema: declarationDraftGetEnvelopeSchema },
			},
		},
		...errorResponses,
	},
});

const writeDraftShared = {
	tags: ["DeclarationDraft"] as string[],
	security: [{ neonAuthSession: [] }],
	request: {
		body: {
			content: {
				"application/json": { schema: saveClientDeclarationDraftSchema },
			},
			required: true,
		},
	},
	responses: {
		200: {
			description: "Draft saved",
			content: {
				"application/json": { schema: declarationDraftWriteEnvelopeSchema },
			},
		},
		...errorResponses,
	},
};

registry.registerPath({
	method: "put",
	path: "/api/client/declaration-draft",
	summary: "Persist client declaration draft",
	description:
		"Full draft replace (saveClientDeclarationDraftSchema). Cache-Control: private, no-store.",
	...writeDraftShared,
});

registry.registerPath({
	method: "patch",
	path: "/api/client/declaration-draft",
	summary: "Persist client declaration draft",
	description:
		"Same write body as PUT when partial fields are not split at the schema. Cache-Control: private, no-store.",
	...writeDraftShared,
});

registry.registerPath({
	method: "post",
	path: "/api/client/declaration-draft",
	summary: "Persist draft (keepalive alias)",
	description:
		"Keepalive alias of PUT/PATCH with the same body. Cache-Control: private, no-store.",
	...writeDraftShared,
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
	openapi: "3.0.3",
	info: {
		title: "Afenda-Lite HTTP (api-now)",
		version: "1.0.0",
		description:
			"Machine OpenAPI for implemented Route Handlers only. Success JSON uses `{ data }` (healthJson / apiData). Errors use APIErrorBody (no data wrapper). Neon Auth `/api/auth/*` is excluded. Contract-only REST lives in REST-001 until handlers exist. One-version rule: no `/api/v1`.",
	},
	servers: [
		{
			url: "https://afenda-lite.vercel.app",
			description: "Production",
		},
		{
			url: "http://localhost:3000",
			description: "Local next dev",
		},
	],
	tags: [
		{ name: "Health", description: "Public probes" },
		{
			name: "DeclarationDraft",
			description: "Client autosave XHR (api-now)",
		},
	],
});

const operationMetadata = {
	"/api/health/liveness": {
		get: { operationId: "getHealthLiveness", status: "api-now" },
	},
	"/api/health/readiness": {
		get: { operationId: "getHealthReadiness", status: "api-now" },
	},
	"/api/client/declaration-draft": {
		get: { operationId: "getClientDeclarationDraft", status: "api-now" },
		put: { operationId: "putClientDeclarationDraft", status: "api-now" },
		patch: { operationId: "patchClientDeclarationDraft", status: "api-now" },
		post: {
			operationId: "postClientDeclarationDraftKeepalive",
			status: "api-now",
		},
	},
} as const;

for (const [route, methods] of Object.entries(operationMetadata)) {
	for (const [method, metadata] of Object.entries(methods)) {
		const operation =
			document.paths?.[route]?.[
				method as keyof (typeof document.paths)[string]
			];
		if (!operation || typeof operation !== "object") {
			throw new Error(
				`Missing generated operation ${method.toUpperCase()} ${route}`,
			);
		}
		Object.assign(operation, {
			operationId: metadata.operationId,
			"x-afenda-status": metadata.status,
		});
	}
}

Object.assign(document, {
	"x-afenda-document": {
		id: "OPEN-001",
		version: "1.1.6",
		generatedAt: "2026-07-15",
	},
});

const header = [
	"# GENERATED — do not hand-edit.",
	"# Source: scripts/generate-openapi.mts",
	"# Guide: docs/api/OPEN-001-openapi.md",
	"# Regenerate: pnpm openapi:generate",
	"",
].join("\n");

writeFileSync(
	outPath,
	`${header}${stringifyYaml(JSON.parse(JSON.stringify(document)), {
		lineWidth: 100,
		aliasDuplicateObjects: false,
	})}\n`,
	"utf8",
);
console.log(`Wrote ${outPath}`);
