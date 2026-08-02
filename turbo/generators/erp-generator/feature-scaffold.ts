import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import { applyGeneratorFileTransaction } from "../engine/file-transaction.ts";

export const ERP_FEATURE_SCAFFOLD_SCHEMA =
	"afenda.erp-feature-scaffold/v1" as const;

export interface ErpFeatureScaffoldSpec {
	readonly featureId: string;
	readonly moduleId: string;
}

export interface ErpFeatureScaffoldFile {
	readonly contents: string;
	readonly path: string;
}

export interface ErpFeatureScaffoldPlanV1 {
	readonly featureId: string;
	readonly featurePath: string;
	readonly files: readonly ErpFeatureScaffoldFile[];
	readonly moduleId: string;
	readonly packagePath: string;
	readonly schema: typeof ERP_FEATURE_SCAFFOLD_SCHEMA;
	readonly writes: false;
}

export interface ApplyErpFeatureScaffoldResult {
	readonly featurePath: string;
	readonly filesWritten: readonly string[];
	readonly schema: typeof ERP_FEATURE_SCAFFOLD_SCHEMA;
	readonly writes: true;
}

export class ErpFeatureScaffoldError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ErpFeatureScaffoldError";
	}
}

const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const assertKebabCase = (field: string, value: string): void => {
	if (!KEBAB_CASE.test(value)) {
		throw new ErpFeatureScaffoldError(`${field} must be kebab-case`);
	}
};

const symbolName = (featureId: string): string =>
	`${featureId
		.split("-")
		.map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
		.join("")}Feature`;

const featureIndex = (featureId: string): string =>
	`export const ${symbolName(featureId)} = {\n\tid: "${featureId}",\n} as const;\n`;

const featureReadme = (featureId: string, moduleId: string): string =>
	`# ${featureId}\n\nGenerated feature scaffold for @afenda/${moduleId}. Add semantic operations before product use.\n`;

const featureTest = (featureId: string, moduleId: string): string =>
	`import { describe, expect, it } from "vitest";\nimport { ${symbolName(featureId)} } from "../src/features/${featureId}";\n\ndescribe("@afenda/${moduleId} ${featureId} feature scaffold", () => {\n\tit("declares the feature id", () => {\n\t\texpect(${symbolName(featureId)}.id).toBe("${featureId}");\n\t});\n});\n`;

export const createErpFeatureScaffoldPlan = (
	spec: ErpFeatureScaffoldSpec,
): ErpFeatureScaffoldPlanV1 => {
	assertKebabCase("moduleId", spec.moduleId);
	assertKebabCase("featureId", spec.featureId);
	const packagePath = `packages/erp/${spec.moduleId}`;
	const featurePath = `${packagePath}/src/features/${spec.featureId}`;
	const files = Object.freeze([
		{
			path: `${featurePath}/index.ts`,
			contents: featureIndex(spec.featureId),
		},
		{
			path: `${featurePath}/README.md`,
			contents: featureReadme(spec.featureId, spec.moduleId),
		},
		{
			path: `${packagePath}/__tests__/${spec.moduleId}.${spec.featureId}.feature.test.ts`,
			contents: featureTest(spec.featureId, spec.moduleId),
		},
	] as const);
	return Object.freeze({
		schema: ERP_FEATURE_SCAFFOLD_SCHEMA,
		moduleId: spec.moduleId,
		featureId: spec.featureId,
		packagePath,
		featurePath,
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

export const applyErpFeatureScaffold = async ({
	repositoryRoot,
	spec,
}: {
	readonly repositoryRoot: string;
	readonly spec: ErpFeatureScaffoldSpec;
}): Promise<ApplyErpFeatureScaffoldResult> => {
	const plan = createErpFeatureScaffoldPlan(spec);
	if (!(await pathExists(repositoryRoot, plan.packagePath))) {
		throw new ErpFeatureScaffoldError(
			`package does not exist: ${plan.packagePath}`,
		);
	}
	if (await pathExists(repositoryRoot, plan.featurePath)) {
		throw new ErpFeatureScaffoldError(
			`refusing to overwrite existing feature ${plan.featurePath}`,
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
		schema: ERP_FEATURE_SCAFFOLD_SCHEMA,
		featurePath: plan.featurePath,
		writes: true,
		filesWritten: transaction.filesWritten,
	});
};
