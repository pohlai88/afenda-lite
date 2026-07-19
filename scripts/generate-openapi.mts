/**
 * Emit docs-V2/api/OPEN-001-openapi.yaml for api-now HTTP only.
 *
 * Zod SSOT: apps/web/modules/platform schemas + `@afenda/openapi` helpers.
 * Run with: pnpm exec tsx --tsconfig apps/web/tsconfig.json scripts/generate-openapi.mts
 *
 * @see docs-V2/api/rest.md
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	dataEnvelope,
	OPENAPI_DOCUMENT_ID,
	OPENAPI_VERSION,
	OpenAPIRegistry,
	OpenApiGeneratorV3,
	type OperationMetadataMap,
	stampAfendaDocument,
	stampOperationMetadata,
	writeOpenApiYaml,
	z,
} from "@afenda/openapi";

import { apiErrorBodySchema } from "../apps/web/modules/platform/schemas/api-error";
import {
	livenessResponseSchema,
	readinessResponseSchema,
} from "../apps/web/modules/platform/schemas/health";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = join("docs-V2", "api", "OPEN-001-openapi.yaml");
const outPath = process.env.OPENAPI_OUT
	? process.env.OPENAPI_OUT
	: join(root, OUT_REL);

const YAML_HEADER_LINES = [
	"# GENERATED — do not hand-edit.",
	"# Source: scripts/generate-openapi.mts",
	"# Scratch authority: docs-V2/api/rest.md",
	"# Regenerate: pnpm openapi:generate",
	"",
] as const;

const OPERATION_METADATA = {
	"/api/health/liveness": {
		get: { operationId: "getHealthLiveness", status: "api-now" },
	},
	"/api/health/readiness": {
		get: { operationId: "getHealthReadiness", status: "api-now" },
	},
	"/api/metrics": {
		get: { operationId: "getMetricsScrape", status: "api-now" },
	},
} as const satisfies OperationMetadataMap;

const DOCUMENT_META = {
	id: OPENAPI_DOCUMENT_ID,
	version: "1.2.0",
	generatedAt: "2026-07-20",
} as const;

const livenessEnvelopeSchema = dataEnvelope(
	livenessResponseSchema,
	"LivenessEnvelope",
);
const readinessEnvelopeSchema = dataEnvelope(
	readinessResponseSchema,
	"ReadinessEnvelope",
);

const registry = new OpenAPIRegistry();

registry.register("APIErrorBody", apiErrorBodySchema);
registry.register("LivenessResponse", livenessResponseSchema);
registry.register("ReadinessResponse", readinessResponseSchema);
registry.register("LivenessEnvelope", livenessEnvelopeSchema);
registry.register("ReadinessEnvelope", readinessEnvelopeSchema);

registry.registerComponent("securitySchemes", "neonAuthSession", {
	type: "apiKey",
	in: "cookie",
	name: "session",
	description:
		"Neon Auth client session cookie (browser same-origin). Cookie name here is illustrative — Neon owns the real name.",
});

registry.registerComponent("securitySchemes", "metricsScrapeBearer", {
	type: "http",
	scheme: "bearer",
	description:
		"Bearer token matching server env METRICS_SCRAPE_TOKEN. Unset token → 404 (fail closed).",
});

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
	description:
		"DB / auth dependency snapshot. Prefer Cache-Control: no-store. HTTP 503 when status is not_ready (critical storage unreachable); 200 for ready and degraded.",
	tags: ["Health"],
	responses: {
		200: {
			description: "Ready or degraded snapshot",
			content: {
				"application/json": { schema: readinessEnvelopeSchema },
			},
		},
		503: {
			description:
				"Not ready — critical dependency (postgres) unreachable; body still `{ data: ReadinessResponse }`",
			content: {
				"application/json": { schema: readinessEnvelopeSchema },
			},
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/metrics",
	summary: "Prometheus metrics scrape",
	description:
		"Prometheus text exposition from @afenda/metrics. Requires Authorization: Bearer matching METRICS_SCRAPE_TOKEN. Fail closed when token unset (404).",
	tags: ["Observability"],
	security: [{ metricsScrapeBearer: [] }],
	responses: {
		200: {
			description: "Prometheus exposition text",
			content: {
				"text/plain": {
					schema: z.string().openapi({
						type: "string",
						description: "Prometheus metrics body",
					}),
				},
			},
		},
		401: {
			description: "Missing or invalid bearer token",
		},
		404: {
			description: "Scrape disabled — METRICS_SCRAPE_TOKEN unset",
		},
	},
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
	openapi: OPENAPI_VERSION,
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
		{ name: "Observability", description: "Prometheus scrape" },
	],
});

stampOperationMetadata(document, OPERATION_METADATA);
stampAfendaDocument(document, DOCUMENT_META);
writeOpenApiYaml(outPath, document, YAML_HEADER_LINES);
console.log(`Wrote ${outPath}`);
