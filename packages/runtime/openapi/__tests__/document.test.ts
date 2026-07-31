import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { openapi } from "../src/index";
import { openapiNode } from "../src/node/index";

function createFixtureRegistry() {
	const registry = openapi.registry.create();
	const body = openapi.envelope.data(
		openapi.schema.z.object({ status: openapi.schema.z.literal("alive") }),
		"AliveEnvelope",
	);
	registry.schema("AliveEnvelope", body);
	registry.path({
		method: "get",
		path: "/api/health/liveness",
		responses: {
			200: {
				description: "ok",
				content: { "application/json": { schema: body } },
			},
		},
		summary: "Liveness",
	});
	return registry;
}

describe("@afenda/openapi capability", () => {
	it("owns envelope registration and stamped document generation", () => {
		const document = createFixtureRegistry().document({
			config: {
				openapi: openapi.document.version,
				info: { title: "Test", version: "0.0.0" },
			},
			meta: {
				id: openapi.document.id,
				version: "1.2.0",
				generatedAt: "2026-07-20",
			},
			operations: {
				"/api/health/liveness": {
					get: { operationId: "getHealthLiveness", status: "api-now" },
				},
			},
		});

		expect(document.paths?.["/api/health/liveness"]?.get?.operationId).toBe(
			"getHealthLiveness",
		);
		expect(
			document.paths?.["/api/health/liveness"]?.get?.["x-afenda-status"],
		).toBe("api-now");
		expect(document["x-afenda-document"]).toEqual({
			id: "OPEN-001",
			version: "1.2.0",
			generatedAt: "2026-07-20",
		});
	});

	it("rejects metadata for an operation absent from the registry", () => {
		const registry = openapi.registry.create();
		expect(() =>
			registry.document({
				config: {
					openapi: openapi.document.version,
					info: { title: "Test", version: "0.0.0" },
				},
				meta: {
					id: openapi.document.id,
					version: "1.0.0",
					generatedAt: "2026-07-20",
				},
				operations: {
					"/api/missing": {
						get: { operationId: "missing", status: "api-now" },
					},
				},
			}),
		).toThrow(/Missing generated operation GET \/api\/missing/);
	});

	it("emits deterministic YAML through the Node projection", () => {
		const document = { openapi: openapi.document.version, paths: {} };
		const header = ["# GENERATED — do not hand-edit."];
		const yamlText = openapiNode.yaml.format(document, header);
		expect(yamlText).toContain("openapi: 3.0.3");

		const dir = mkdtempSync(join(tmpdir(), "afenda-openapi-"));
		const outPath = join(dir, "fixture.yaml");
		try {
			openapiNode.yaml.write(outPath, document, header);
			expect(readFileSync(outPath, "utf8")).toBe(yamlText);
			const parsed = parseYaml(yamlText) as { openapi: string };
			expect(parsed.openapi).toBe("3.0.3");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
