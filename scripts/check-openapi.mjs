/**
 * Fail if OpenAPI YAML is missing, drifted from generate, Spectral-invalid,
 * or marks api-now paths whose Route Handlers are absent on disk (GUIDE-018 I2.4).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { validateOpenApiFile } from "../.cursor/skills/afenda-elite-doc-integrity/scripts/doc-integrity-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const yamlPath = join(root, "docs", "api", "OPEN-001-openapi.yaml");
const webApiRoot = join(root, "apps", "web", "app", "api");

function fail(message, code = 1) {
	console.error(`check:openapi: ${message}`);
	process.exit(code);
}

// Map OpenAPI path to apps/web/app/api/.../route.ts
// Dynamic `{id}` / `{...path}` segments become Next `[id]` / `[...path]`.
function openApiPathToRouteFile(openApiPath) {
	const segments = openApiPath
		.replace(/^\/api\/?/, "")
		.split("/")
		.filter(Boolean)
		.map((segment) => {
			if (segment.startsWith("{") && segment.endsWith("}")) {
				const inner = segment.slice(1, -1);
				if (inner.startsWith("...")) {
					return `[${inner}]`;
				}
				return `[${inner}]`;
			}
			return segment;
		});
	return join(webApiRoot, ...segments, "route.ts");
}

function assertApiNowHandlersOnDisk(document) {
	const paths = document?.paths;
	if (!paths || typeof paths !== "object") {
		fail("OPEN-001-openapi.yaml has no paths object", 2);
	}

	const missing = [];
	for (const [routePath, methods] of Object.entries(paths)) {
		if (!methods || typeof methods !== "object") continue;
		for (const [method, operation] of Object.entries(methods)) {
			if (
				method.startsWith("x-") ||
				!operation ||
				typeof operation !== "object"
			) {
				continue;
			}
			if (operation["x-afenda-status"] !== "api-now") continue;
			const routeFile = openApiPathToRouteFile(routePath);
			if (!existsSync(routeFile)) {
				missing.push(
					`${method.toUpperCase()} ${routePath} → missing ${routeFile.replace(`${root}\\`, "").replace(`${root}/`, "")}`,
				);
			}
		}
	}

	if (missing.length > 0) {
		for (const row of missing) console.error(`  - ${row}`);
		fail(
			"api-now OpenAPI operations lack Route Handlers on disk — implement handlers or remove api-now mark",
		);
	}
}

if (!existsSync(yamlPath)) {
	fail("missing docs/api/OPEN-001-openapi.yaml — run pnpm openapi:generate", 2);
}

const dir = mkdtempSync(join(tmpdir(), "afenda-openapi-"));
const generatedPath = join(dir, "OPEN-001-openapi.yaml");

try {
	const generate = spawnSync(
		"npx",
		[
			"tsx",
			"--tsconfig",
			"apps/web/tsconfig.json",
			"scripts/generate-openapi.mts",
		],
		{
			cwd: root,
			encoding: "utf8",
			shell: true,
			env: { ...process.env, OPENAPI_OUT: generatedPath },
		},
	);
	if (generate.status !== 0) {
		fail(`generate failed:\n${generate.stderr || generate.stdout}`, 2);
	}

	const committed = readFileSync(yamlPath, "utf8");
	const generated = readFileSync(generatedPath, "utf8");
	if (committed !== generated) {
		fail(
			"OPEN-001-openapi.yaml drifted from scripts/generate-openapi.mts — run pnpm openapi:generate and commit",
		);
	}
} finally {
	rmSync(dir, { recursive: true, force: true });
}

let document;
try {
	document = parseYaml(readFileSync(yamlPath, "utf8"));
} catch (error) {
	fail(`YAML parse failed: ${error.message}`, 2);
}
assertApiNowHandlersOnDisk(document);

let validation;
try {
	validation = await validateOpenApiFile(yamlPath, {
		afendaRules: false,
		spectralConfigPath: join(root, ".spectral.yaml"),
	});
} catch (error) {
	fail(`validator dependency or execution failure: ${error.message}`, 2);
}
if (!validation.complete) {
	fail("structured OpenAPI parsing or validation coverage was incomplete", 2);
}
if (validation.issues.length > 0) {
	for (const issue of validation.issues) console.error(`  - ${issue}`);
	fail("structured OpenAPI and Afenda contract validation failed");
}

console.log(
	`check:openapi: ok (${validation.operations} operations, ${validation.refs} references, api-now handlers on disk)`,
);
