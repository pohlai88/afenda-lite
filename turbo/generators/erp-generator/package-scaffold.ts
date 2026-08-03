import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import { applyGeneratorFileTransaction } from "../engine/file-transaction.ts";
import { isErpKebabCase } from "./naming.ts";

export const ERP_PACKAGE_SCAFFOLD_SCHEMA =
	"afenda.erp-package-scaffold/v1" as const;

export interface ErpPackageScaffoldSpec {
	readonly category: string;
	readonly lifecycle?: "active" | "candidate" | "scaffolded";
	readonly moduleId: string;
}

export interface ErpPackageScaffoldFile {
	readonly contents: string;
	readonly path: string;
}

export interface ErpPackageScaffoldPlanV1 {
	readonly files: readonly ErpPackageScaffoldFile[];
	readonly moduleId: string;
	readonly packageName: `@afenda/${string}`;
	readonly packagePath: string;
	readonly schema: typeof ERP_PACKAGE_SCAFFOLD_SCHEMA;
	readonly writes: false;
}

export interface ApplyErpPackageScaffoldResult {
	readonly filesWritten: readonly string[];
	readonly packagePath: string;
	readonly schema: typeof ERP_PACKAGE_SCAFFOLD_SCHEMA;
	readonly writes: true;
}

export class ErpPackageScaffoldError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ErpPackageScaffoldError";
	}
}

const assertKebabCase = (field: string, value: string): void => {
	if (!isErpKebabCase(value)) {
		throw new ErpPackageScaffoldError(`${field} must be kebab-case`);
	}
};

const variablePrefix = (moduleId: string): string =>
	moduleId.replaceAll("-", "_").toUpperCase();

/**
 * `pnpm validate:modules` resolves the manifest by its camelCase export name, and
 * every shipped ERP package spells it that way, so the first segment stays
 * lower-cased rather than following the PascalCase used for feature symbols.
 */
const moduleExportName = (moduleId: string): string =>
	`${moduleId
		.split("-")
		.map((part, position) =>
			position === 0 ? part : `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`,
		)
		.join("")}ModuleManifest`;

const packageJson = (moduleId: string): string =>
	`${JSON.stringify(
		{
			name: `@afenda/${moduleId}`,
			version: "0.0.0",
			private: true,
			type: "module",
			exports: {
				".": {
					types: "./src/index.ts",
					default: "./src/index.ts",
				},
				"./module-manifest": {
					types: "./src/composition/module.manifest.ts",
					default: "./src/composition/module.manifest.ts",
				},
			},
			scripts: {
				lint: "biome check .",
				typecheck: "tsc --noEmit -p tsconfig.json",
				test: `vitest run --config ../../../testing/vitest.unit.config.ts --project ${moduleId}`,
				check: "pnpm lint && pnpm typecheck && pnpm test",
			},
			dependencies: {
				"@afenda/db": "workspace:*",
				"@afenda/errors": "workspace:*",
				"server-only": "catalog:",
				zod: "catalog:",
			},
			devDependencies: {
				"@afenda/config": "workspace:*",
				"@types/node": "catalog:",
				typescript: "catalog:",
				vitest: "catalog:",
			},
		},
		null,
		"\t",
	)}\n`;

/**
 * Every shipped ERP package resolves its base config through the workspace
 * dependency `@afenda/config`, not a relative path into `packages/foundation`.
 * Tests stay outside `include` so `tsc` matches the shipped packages and does
 * not pull vitest's ambient types into the production program.
 */
const tsconfigJson = (): string =>
	`${JSON.stringify(
		{
			extends: "@afenda/config/tsconfig/node-library.json",
			compilerOptions: {
				rootDir: "src",
			},
			include: ["src/**/*.ts"],
			exclude: ["node_modules", "dist"],
		},
		null,
		"\t",
	)}\n`;

const operationRegistry = (moduleId: string): string => {
	const prefix = variablePrefix(moduleId);
	return `export const ${prefix}_COMMAND_IDS = [] as const;\nexport const ${prefix}_QUERY_IDS = [] as const;\nexport const ${prefix}_EMITTED_EVENT_IDS = [] as const;\nexport const ${prefix}_COMMAND_AUTHORIZATION = {} as const;\nexport const ${prefix}_QUERY_AUTHORIZATION = {} as const;\n`;
};

const permissions = (moduleId: string): string =>
	`export const ${variablePrefix(moduleId)}_PERMISSION_CODES = [] as const;\n`;

const kernelIndex = (moduleId: string): string => {
	const prefix = variablePrefix(moduleId);
	return `export {\n\t${prefix}_COMMAND_AUTHORIZATION,\n\t${prefix}_COMMAND_IDS,\n\t${prefix}_EMITTED_EVENT_IDS,\n\t${prefix}_QUERY_AUTHORIZATION,\n\t${prefix}_QUERY_IDS,\n} from "./operations/registry";\nexport { ${prefix}_PERMISSION_CODES } from "./permissions";\n`;
};

const manifest = ({
	category,
	lifecycle,
	moduleId,
}: Required<ErpPackageScaffoldSpec>): string => {
	const prefix = variablePrefix(moduleId);
	return `import type { AfendaModuleManifest } from "@afenda/db/module-manifest";\nimport {\n\t${prefix}_COMMAND_AUTHORIZATION,\n\t${prefix}_COMMAND_IDS,\n\t${prefix}_EMITTED_EVENT_IDS,\n\t${prefix}_PERMISSION_CODES,\n\t${prefix}_QUERY_AUTHORIZATION,\n\t${prefix}_QUERY_IDS,\n} from "../kernel";\n\nexport const ${moduleExportName(moduleId)} = {\n\tid: "${moduleId}",\n\tcategory: "${category}",\n\tpackageName: "@afenda/${moduleId}",\n\tband: "R1-F",\n\tlifecycle: "${lifecycle}",\n\tactivationMode: "organization_toggle",\n\towns: {\n\t\taggregates: [],\n\t\tcommandNamespace: "${moduleId}",\n\t\tcommands: [...${prefix}_COMMAND_IDS],\n\t\tqueryNamespace: "${moduleId}",\n\t\tqueries: [...${prefix}_QUERY_IDS],\n\t},\n\tpersistence: {\n\t\tschemaOwner: "@afenda/db",\n\t\tmutationTables: [],\n\t},\n\tevents: {\n\t\tnamespace: "${moduleId}",\n\t\temits: [...${prefix}_EMITTED_EVENT_IDS],\n\t\tconsumes: [],\n\t},\n\tpermissions: {\n\t\tnamespace: "${moduleId}",\n\t\tcodes: [...${prefix}_PERMISSION_CODES],\n\t},\n\tauthorization: {\n\t\tcommands: ${prefix}_COMMAND_AUTHORIZATION,\n\t\tqueries: ${prefix}_QUERY_AUTHORIZATION,\n\t},\n\tmoduleDependencies: {\n\t\trequired: [],\n\t},\n\toptionalIntegratesWith: [],\n} as const satisfies AfendaModuleManifest;\n`;
};

const publicApi = (moduleId: string): string =>
	`export { ${moduleExportName(moduleId)} } from "../composition/module.manifest";\n`;

const index = (moduleId: string): string =>
	`import "server-only";\n\nexport { ${moduleExportName(moduleId)} } from "./facade/public-api";\n`;

const readme = (moduleId: string): string =>
	`# @afenda/${moduleId}\n\nGenerated ERP package scaffold. Fill semantic owners before activation.\n`;

/**
 * The horizontal directories are ownership permissions, not empty-folder
 * requirements — but the scaffold must still put the canonical topology on disk
 * so the first real owner lands in the right place instead of a root layer
 * farm. Each carries its charter so an empty directory is never mistaken for an
 * unclaimed one.
 */
const featuresReadme = (moduleId: string): string =>
	`# features\n\nPrimary business-ownership axis for \`@afenda/${moduleId}\`.\n\nOne directory per business capability, each owning its definitions, contracts,\nschemas, policy, use cases, narrow store contract, and adapters. No file here\nimports \`composition\`, \`facade\`, or \`testing\`.\n\nAdd capsules with the ERP feature generator rather than by hand.\n`;

const testingReadme = (moduleId: string): string =>
	`# testing\n\nIsolated memory and parity capabilities for \`@afenda/${moduleId}\`, published\nonly through an auxiliary \`/testing\` export with a proved isolation need and an\naccepted consumer class.\n\nIt is never a second business API, and \`features/**\` never imports it.\n`;

const scriptsReadme = (moduleId: string): string =>
	`# scripts\n\nDeterministic layout and governance projections for \`@afenda/${moduleId}\` that\nthe shared generator does not already own.\n\nLayout enforcement belongs to the ERP generator: a local \`feature-first-layout.mjs\`\nis reported as superseded (\`AFG-ERP-103\`).\n`;

const testFile = (moduleId: string): string =>
	`import { describe, expect, it } from "vitest";\nimport { ${moduleExportName(moduleId)} } from "../src";\n\ndescribe("@afenda/${moduleId} scaffold", () => {\n\tit("declares the canonical module manifest", () => {\n\t\texpect(${moduleExportName(moduleId)}.id).toBe("${moduleId}");\n\t\texpect(${moduleExportName(moduleId)}.packageName).toBe("@afenda/${moduleId}");\n\t});\n});\n`;

export const createErpPackageScaffoldPlan = (
	spec: ErpPackageScaffoldSpec,
): ErpPackageScaffoldPlanV1 => {
	assertKebabCase("moduleId", spec.moduleId);
	assertKebabCase("category", spec.category);
	const lifecycle = spec.lifecycle ?? "scaffolded";
	const packagePath = `packages/erp/${spec.moduleId}`;
	const files = Object.freeze([
		{
			path: `${packagePath}/package.json`,
			contents: packageJson(spec.moduleId),
		},
		{ path: `${packagePath}/tsconfig.json`, contents: tsconfigJson() },
		{ path: `${packagePath}/README.md`, contents: readme(spec.moduleId) },
		{ path: `${packagePath}/src/index.ts`, contents: index(spec.moduleId) },
		{
			path: `${packagePath}/src/facade/public-api.ts`,
			contents: publicApi(spec.moduleId),
		},
		{
			path: `${packagePath}/src/kernel/index.ts`,
			contents: kernelIndex(spec.moduleId),
		},
		{
			path: `${packagePath}/src/kernel/operations/registry.ts`,
			contents: operationRegistry(spec.moduleId),
		},
		{
			path: `${packagePath}/src/kernel/permissions.ts`,
			contents: permissions(spec.moduleId),
		},
		{
			path: `${packagePath}/src/composition/module.manifest.ts`,
			contents: manifest({
				category: spec.category,
				lifecycle,
				moduleId: spec.moduleId,
			}),
		},
		{
			path: `${packagePath}/src/features/README.md`,
			contents: featuresReadme(spec.moduleId),
		},
		{
			path: `${packagePath}/src/testing/README.md`,
			contents: testingReadme(spec.moduleId),
		},
		{
			path: `${packagePath}/scripts/README.md`,
			contents: scriptsReadme(spec.moduleId),
		},
		{
			path: `${packagePath}/__tests__/${spec.moduleId}.scaffold.test.ts`,
			contents: testFile(spec.moduleId),
		},
	] as const);
	return Object.freeze({
		schema: ERP_PACKAGE_SCAFFOLD_SCHEMA,
		moduleId: spec.moduleId,
		packageName: `@afenda/${spec.moduleId}`,
		packagePath,
		writes: false,
		files,
	});
};

const pathExists = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		await stat(resolve(repositoryRoot, path));
		return true;
	} catch {
		return false;
	}
};

export const applyErpPackageScaffold = async ({
	repositoryRoot,
	spec,
}: {
	readonly repositoryRoot: string;
	readonly spec: ErpPackageScaffoldSpec;
}): Promise<ApplyErpPackageScaffoldResult> => {
	const plan = createErpPackageScaffoldPlan(spec);
	if (await pathExists(repositoryRoot, plan.packagePath)) {
		throw new ErpPackageScaffoldError(
			`refusing to overwrite existing package ${plan.packagePath}`,
		);
	}
	const transaction = await applyGeneratorFileTransaction({
		repositoryRoot,
		writes: plan.files.map((file) => ({
			path: file.path,
			contents: file.contents,
			policy: "create",
		})),
	});
	return Object.freeze({
		schema: ERP_PACKAGE_SCAFFOLD_SCHEMA,
		packagePath: plan.packagePath,
		writes: true,
		filesWritten: transaction.filesWritten,
	});
};
