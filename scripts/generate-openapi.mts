/**
 * Emit docs-V2/api/OPEN-001-openapi.yaml for api-now HTTP only.
 *
 * Zod SSOT: apps/web/modules/platform schemas.
 * Run with: pnpm exec tsx --tsconfig apps/web/tsconfig.json scripts/generate-openapi.mts
 *
 * @see docs-V2/api/rest.md
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	OpenAPIRegistry,
	OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { stringify as stringifyYaml } from "yaml";

import { apiErrorBodySchema } from "../apps/web/modules/platform/schemas/api-error";
import {
	livenessResponseSchema,
	readinessResponseSchema,
} from "../apps/web/modules/platform/schemas/health";
import { z } from "../apps/web/modules/platform/schemas/openapi-zod";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = join("docs-V2", "api", "OPEN-001-openapi.yaml");
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
		{ name: "Observability", description: "Prometheus scrape" },
	],
});

const operationMetadata = {
	"/api/health/liveness": {
		get: { operationId: "getHealthLiveness", status: "api-now" },
	},
	"/api/health/readiness": {
		get: { operationId: "getHealthReadiness", status: "api-now" },
	},
	"/api/metrics": {
		get: { operationId: "getMetricsScrape", status: "api-now" },
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
		version: "1.2.0",
		generatedAt: "2026-07-20",
	},
});

const header = [
	"# GENERATED — do not hand-edit.",
	"# Source: scripts/generate-openapi.mts",
	"# Scratch authority: docs-V2/api/rest.md",
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
