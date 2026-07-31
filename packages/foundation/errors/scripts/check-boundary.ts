/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { fileURLToPath } from "node:url";

import { build } from "vite";

const LEGACY_IMPLEMENTATION_MODULES = [
	/\/src\/contract\/codes\.ts$/u,
	/\/src\/failure\/app-error\.ts$/u,
	/\/src\/failure\/factories\.ts$/u,
	/\/src\/ingress\/normalize\.ts$/u,
	/\/src\/ingress\/postgres\.ts$/u,
	/\/src\/internal\/public-error-policy\.ts$/u,
	/\/src\/project\/retry-after\.ts$/u,
	/\/src\/security\/safe-details\.ts$/u,
	/\/src\/wire\/app-error\.ts$/u,
];

const LEGACY_IMPLEMENTATION_TOKENS = [
	'"23505"',
	"ERROR_HTTP_STATUS",
	"errorDiagnosticFields",
	"postgresSqlState",
];

const CAPABILITY_CASES = [
	{
		entry: "result-only.ts",
		forbiddenModules: [
			...LEGACY_IMPLEMENTATION_MODULES,
			/\/src\/failure\//u,
			/\/src\/ingress\//u,
			/\/src\/openapi\//u,
			/\/src\/project\//u,
			/\/src\/wire\//u,
			/\/src\/capabilities\/(?:ingress|openapi|project|wire)\.ts$/u,
		],
		forbiddenTokens: [...LEGACY_IMPLEMENTATION_TOKENS, "afenda.failure/v1"],
		maximumBytes: 40_960,
		name: "result",
		requiredModules: [
			/\/src\/capabilities\/result\.ts$/u,
			/\/src\/result\/context\.ts$/u,
			/\/src\/result\/fail\.ts$/u,
		],
		requiredTokens: ["NOT_FOUND"],
	},
	{
		entry: "retry-only.ts",
		forbiddenModules: [
			...LEGACY_IMPLEMENTATION_MODULES,
			/\/src\/ingress\//u,
			/\/src\/openapi\//u,
			/\/src\/result\/(?:fail|ok)\.ts$/u,
			/\/src\/wire\//u,
			/\/src\/capabilities\/(?:ingress|openapi|result|wire)\.ts$/u,
		],
		forbiddenTokens: [...LEGACY_IMPLEMENTATION_TOKENS, "afenda.failure/v1"],
		maximumBytes: 40_960,
		name: "retry",
		requiredModules: [
			/\/src\/capabilities\/project\.ts$/u,
			/\/src\/project\/diagnostics\.ts$/u,
			/\/src\/project\/http\.ts$/u,
			/\/src\/project\/result\.ts$/u,
			/\/src\/project\/retry\.ts$/u,
		],
		requiredTokens: [
			"Retry projection requires a canonical failure.",
			"SERVICE_UNAVAILABLE",
		],
	},
	{
		entry: "wire-only.ts",
		forbiddenModules: [
			...LEGACY_IMPLEMENTATION_MODULES,
			/\/src\/ingress\//u,
			/\/src\/openapi\//u,
			/\/src\/project\//u,
			/\/src\/result\/(?:fail|ok)\.ts$/u,
			/\/src\/capabilities\/(?:ingress|openapi|project|result)\.ts$/u,
		],
		forbiddenTokens: [...LEGACY_IMPLEMENTATION_TOKENS, '"oneOf"'],
		maximumBytes: 53_248,
		name: "wire",
		requiredModules: [
			/\/src\/capabilities\/wire\.ts$/u,
			/\/src\/wire\/deserialize\.ts$/u,
			/\/src\/wire\/serialize\.ts$/u,
		],
		requiredTokens: ["afenda.failure/v1", "errors.wire.deserialize"],
	},
	{
		entry: "openapi-only.ts",
		forbiddenModules: [
			...LEGACY_IMPLEMENTATION_MODULES,
			/\/src\/failure\//u,
			/\/src\/ingress\//u,
			/\/src\/project\//u,
			/\/src\/result\/(?:fail|ok)\.ts$/u,
			/\/src\/wire\//u,
			/\/src\/capabilities\/(?:ingress|project|result|wire)\.ts$/u,
		],
		forbiddenTokens: [
			...LEGACY_IMPLEMENTATION_TOKENS,
			"afenda.failure/v1",
			"new WeakMap",
		],
		maximumBytes: 49_152,
		name: "openapi",
		requiredModules: [
			/\/src\/capabilities\/openapi\.ts$/u,
			/\/src\/openapi\/responses\.ts$/u,
		],
		requiredTokens: ["application/json", "CONCURRENCY_CONFLICT", "oneOf"],
	},
];

function fixturePath(entry) {
	return fileURLToPath(
		new URL(`../__tests__/bundle-fixtures/${entry}`, import.meta.url),
	);
}

function normalizedModuleIds(chunks) {
	return [
		...new Set(
			chunks.flatMap((chunk) =>
				Object.keys(chunk.modules).map((moduleId) =>
					moduleId.replaceAll("\\", "/"),
				),
			),
		),
	];
}

function assertRequiredModules(capability, moduleIds) {
	for (const pattern of capability.requiredModules) {
		if (!moduleIds.some((moduleId) => pattern.test(moduleId))) {
			throw new Error(
				`${capability.name} bundle omitted required capability module: ${pattern}`,
			);
		}
	}
}

function assertForbiddenModules(capability, moduleIds) {
	for (const moduleId of moduleIds) {
		if (capability.forbiddenModules.some((pattern) => pattern.test(moduleId))) {
			throw new Error(
				`${capability.name} bundle includes unrelated implementation: ${moduleId}`,
			);
		}
	}
}

function assertTokens(capability, bundle) {
	for (const token of capability.requiredTokens) {
		if (!bundle.includes(token)) {
			throw new Error(
				`${capability.name} bundle omitted required capability token: ${token}`,
			);
		}
	}
	for (const token of capability.forbiddenTokens) {
		if (bundle.includes(token)) {
			throw new Error(
				`${capability.name} bundle contains unrelated implementation token: ${token}`,
			);
		}
	}
}

async function buildCapabilityBundle(capability) {
	const output = await build({
		configFile: false,
		logLevel: "silent",
		build: {
			lib: {
				entry: fixturePath(capability.entry),
				fileName: `${capability.name}-only`,
				formats: ["es"],
			},
			minify: false,
			write: false,
		},
	});
	const outputs = Array.isArray(output) ? output : [output];
	const chunks = outputs
		.flatMap((result) => result.output)
		.filter((item) => item.type === "chunk");
	const bundle = chunks.map((item) => item.code).join("\n");
	const moduleIds = normalizedModuleIds(chunks);

	assertRequiredModules(capability, moduleIds);
	assertForbiddenModules(capability, moduleIds);
	assertTokens(capability, bundle);

	const bytes = Buffer.byteLength(bundle, "utf8");
	if (bytes > capability.maximumBytes) {
		throw new Error(
			`${capability.name} bundle is ${bytes} bytes; maximum is ${capability.maximumBytes}.`,
		);
	}
	return `${capability.name} capability bundle is isolated (${bytes} bytes across ${moduleIds.length} modules; maximum ${capability.maximumBytes}).`;
}

const evidence = await Promise.all(
	CAPABILITY_CASES.map((capability) => buildCapabilityBundle(capability)),
);
console.log(evidence.join("\n"));
