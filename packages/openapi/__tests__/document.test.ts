import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import {
	dataEnvelope,
	formatOpenApiYaml,
	OPENAPI_DOCUMENT_ID,
	OPENAPI_VERSION,
	OpenAPIRegistry,
	OpenApiGeneratorV3,
	stampAfendaDocument,
	stampOperationMetadata,
	writeOpenApiYaml,
	z,
} from "../src/index";

describe("@afenda/openapi document helpers", () => {
	it("exposes living OAS 3.0.3 constant", () => {
		expect(OPENAPI_VERSION).toBe("3.0.3");
	});

	it("wraps inner schemas as { data: T } envelopes", () => {
		const inner = z.object({ status: z.literal("ok") });
		const envelope = dataEnvelope(inner, "OkEnvelope");
		const parsed = envelope.parse({ data: { status: "ok" } });
		expect(parsed).toEqual({ data: { status: "ok" } });
		expect(() => envelope.parse({ status: "ok" })).toThrow();
	});

	it("stamps operation metadata and document extension", () => {
		const registry = new OpenAPIRegistry();
		const body = dataEnvelope(
			z.object({ status: z.literal("alive") }),
			"AliveEnvelope",
		);
		registry.registerPath({
			method: "get",
			path: "/api/health/liveness",
			summary: "Liveness",
			responses: {
				200: {
					description: "ok",
					content: { "application/json": { schema: body } },
				},
			},
		});

		const document = new OpenApiGeneratorV3(
			registry.definitions,
		).generateDocument({
			openapi: OPENAPI_VERSION,
			info: { title: "Test", version: "0.0.0" },
		});

		stampOperationMetadata(document, {
			"/api/health/liveness": {
				get: { operationId: "getHealthLiveness", status: "api-now" },
			},
		});
		stampAfendaDocument(document, {
			id: OPENAPI_DOCUMENT_ID,
			version: "1.2.0",
			generatedAt: "2026-07-20",
		});

		const getOp = document.paths?.["/api/health/liveness"]?.get;
		expect(getOp?.operationId).toBe("getHealthLiveness");
		expect(getOp?.["x-afenda-status"]).toBe("api-now");
		expect(document["x-afenda-document"]).toEqual({
			id: OPENAPI_DOCUMENT_ID,
			version: "1.2.0",
			generatedAt: "2026-07-20",
		});
	});

	it("throws when metadata references a missing operation", () => {
		expect(() =>
			stampOperationMetadata(
				{ paths: {} },
				{
					"/api/missing": {
						get: { operationId: "missing", status: "api-now" },
					},
				},
			),
		).toThrow(/Missing generated operation GET \/api\/missing/);
	});

	it("throws when metadata uses a non-HTTP method key", () => {
		expect(() =>
			stampOperationMetadata(
				{ paths: { "/api/x": { get: {} } } },
				{
					"/api/x": {
						// @ts-expect-error — runtime guard for invalid method keys
						trace: { operationId: "bad", status: "api-now" },
					},
				},
			),
		).toThrow(/Invalid OpenAPI method metadata TRACE \/api\/x/);
	});

	it("formats and writes YAML with header comments", () => {
		const document = {
			openapi: OPENAPI_VERSION,
			info: { title: "Fixture", version: "0.0.1" },
			paths: {},
		};
		const header = [
			"# GENERATED — do not hand-edit.",
			"# Regenerate: pnpm openapi:generate",
		];
		const yamlText = formatOpenApiYaml(document, header);
		expect(yamlText.startsWith("# GENERATED")).toBe(true);
		expect(yamlText).toContain("openapi: 3.0.3");

		const dir = mkdtempSync(join(tmpdir(), "afenda-openapi-"));
		const outPath = join(dir, "fixture.yaml");
		try {
			writeOpenApiYaml(outPath, document, header);
			const onDisk = readFileSync(outPath, "utf8");
			expect(onDisk).toBe(yamlText);
			const parsed = parseYaml(
				onDisk
					.split("\n")
					.filter((line) => !line.startsWith("#"))
					.join("\n"),
			) as { openapi: string; info: { title: string } };
			expect(parsed.openapi).toBe("3.0.3");
			expect(parsed.info.title).toBe("Fixture");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
