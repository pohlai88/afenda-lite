import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { applyGeneratorFileTransaction } from "../engine/file-transaction.ts";
import { isErpKebabCase } from "./naming.ts";

export const ERP_FEATURE_SCAFFOLD_SCHEMA =
	"afenda.erp-feature-scaffold/v1" as const;

export const ERP_FEATURE_GROUP_DEFINITION_FILE = "group.definition.ts" as const;

export interface ErpFeatureScaffoldSpec {
	readonly featureId: string;
	readonly groupId?: string;
	readonly moduleId: string;
}

export interface ErpFeatureScaffoldFile {
	readonly contents: string;
	readonly expectedExistingContents?: string;
	readonly path: string;
	readonly policy: "create" | "replace-if-current";
}

export interface ErpFeatureScaffoldPlanV1 {
	readonly featureId: string;
	readonly featurePath: string;
	readonly files: readonly ErpFeatureScaffoldFile[];
	readonly groupId: string | null;
	readonly groupPath: string | null;
	readonly moduleId: string;
	readonly packagePath: string;
	readonly schema: typeof ERP_FEATURE_SCAFFOLD_SCHEMA;
	readonly writes: false;
}

export interface ApplyErpFeatureScaffoldResult {
	readonly featurePath: string;
	readonly filesWritten: readonly string[];
	readonly groupPath: string | null;
	readonly schema: typeof ERP_FEATURE_SCAFFOLD_SCHEMA;
	readonly writes: true;
}

export class ErpFeatureScaffoldError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ErpFeatureScaffoldError";
	}
}

const assertKebabCase = (field: string, value: string): void => {
	if (!isErpKebabCase(value)) {
		throw new ErpFeatureScaffoldError(`${field} must be kebab-case`);
	}
};

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const pascalCase = (id: string): string =>
	id
		.split("-")
		.map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
		.join("");

const titleCase = (id: string): string =>
	id
		.split("-")
		.map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
		.join(" ");

const featureSymbolName = (featureId: string): string =>
	`${pascalCase(featureId)}Feature`;

const groupSymbolName = (groupId: string): string =>
	`${pascalCase(groupId)}FeatureGroup`;

const featureIndex = (featureId: string): string =>
	`export const ${featureSymbolName(featureId)} = {\n\tid: "${featureId}",\n} as const;\n`;

const featureReadme = (featureId: string, moduleId: string): string =>
	`# ${featureId}\n\nGenerated feature scaffold for @afenda/${moduleId}. Add semantic operations before product use.\n`;

/**
 * A feature group is a classification surface only: it projects membership and a
 * label. It never owns operations, statuses, stores, or facade methods, so the
 * generated definition deliberately carries nothing else.
 */
const groupDefinition = (
	groupId: string,
	featureIds: readonly string[],
): string => {
	const members = [...featureIds]
		.sort(compareText)
		.map((featureId) => `\t\t"${featureId}",\n`)
		.join("");
	return `export const ${groupSymbolName(groupId)} = {\n\tid: "${groupId}",\n\tlabel: "${titleCase(groupId)}",\n\tfeatures: [\n${members}\t],\n} as const;\n`;
};

const featureTest = ({
	featureId,
	groupId,
	moduleId,
}: {
	readonly featureId: string;
	readonly groupId: string | null;
	readonly moduleId: string;
}): string => {
	const importPath =
		groupId === null
			? `../src/features/${featureId}`
			: `../src/features/${groupId}/${featureId}`;
	const description =
		groupId === null
			? `@afenda/${moduleId} ${featureId} feature scaffold`
			: `@afenda/${moduleId} ${groupId}/${featureId} feature scaffold`;
	const groupAssertions =
		groupId === null
			? ""
			: `\n\tit("is a member of its feature group", () => {\n\t\texpect(${groupSymbolName(groupId)}.features).toContain("${featureId}");\n\t});\n`;
	const groupImport =
		groupId === null
			? ""
			: `import { ${groupSymbolName(groupId)} } from "../src/features/${groupId}/group.definition";\n`;
	return `import { describe, expect, it } from "vitest";\n${groupImport}import { ${featureSymbolName(featureId)} } from "${importPath}";\n\ndescribe("${description}", () => {\n\tit("declares the feature id", () => {\n\t\texpect(${featureSymbolName(featureId)}.id).toBe("${featureId}");\n\t});\n${groupAssertions}});\n`;
};

const testFileName = ({
	featureId,
	groupId,
	moduleId,
}: {
	readonly featureId: string;
	readonly groupId: string | null;
	readonly moduleId: string;
}): string =>
	groupId === null
		? `${moduleId}.${featureId}.feature.test.ts`
		: `${moduleId}.${groupId}.${featureId}.feature.test.ts`;

export interface CreateErpFeatureScaffoldPlanOptions {
	/**
	 * Feature ids already registered in the target group. The group definition is
	 * a derived membership projection, so it is regenerated from the full member
	 * set rather than appended to.
	 */
	readonly existingGroupFeatureIds?: readonly string[];
}

export const createErpFeatureScaffoldPlan = (
	spec: ErpFeatureScaffoldSpec,
	options: CreateErpFeatureScaffoldPlanOptions = {},
): ErpFeatureScaffoldPlanV1 => {
	assertKebabCase("moduleId", spec.moduleId);
	assertKebabCase("featureId", spec.featureId);
	const groupId = spec.groupId ?? null;
	if (groupId !== null) {
		assertKebabCase("groupId", groupId);
		if (groupId === spec.featureId) {
			throw new ErpFeatureScaffoldError(
				"groupId and featureId must not be identical",
			);
		}
	}
	const existingGroupFeatureIds = Object.freeze(
		[...(options.existingGroupFeatureIds ?? [])].filter(
			(featureId) => featureId !== spec.featureId,
		),
	);
	if (groupId === null && existingGroupFeatureIds.length > 0) {
		throw new ErpFeatureScaffoldError(
			"existingGroupFeatureIds requires a groupId",
		);
	}
	const packagePath = `packages/erp/${spec.moduleId}`;
	const groupPath =
		groupId === null ? null : `${packagePath}/src/features/${groupId}`;
	const featurePath =
		groupPath === null
			? `${packagePath}/src/features/${spec.featureId}`
			: `${groupPath}/${spec.featureId}`;
	const groupFiles: readonly ErpFeatureScaffoldFile[] =
		groupId === null || groupPath === null
			? Object.freeze([])
			: Object.freeze([
					{
						path: `${groupPath}/${ERP_FEATURE_GROUP_DEFINITION_FILE}`,
						contents: groupDefinition(groupId, [
							...existingGroupFeatureIds,
							spec.featureId,
						]),
						...(existingGroupFeatureIds.length === 0
							? { policy: "create" as const }
							: {
									policy: "replace-if-current" as const,
									expectedExistingContents: groupDefinition(
										groupId,
										existingGroupFeatureIds,
									),
								}),
					},
				]);
	const files = Object.freeze([
		{
			path: `${featurePath}/index.ts`,
			contents: featureIndex(spec.featureId),
			policy: "create" as const,
		},
		{
			path: `${featurePath}/README.md`,
			contents: featureReadme(spec.featureId, spec.moduleId),
			policy: "create" as const,
		},
		...groupFiles,
		{
			path: `${packagePath}/__tests__/${testFileName({
				featureId: spec.featureId,
				groupId,
				moduleId: spec.moduleId,
			})}`,
			contents: featureTest({
				featureId: spec.featureId,
				groupId,
				moduleId: spec.moduleId,
			}),
			policy: "create" as const,
		},
	] as const);
	return Object.freeze({
		schema: ERP_FEATURE_SCAFFOLD_SCHEMA,
		moduleId: spec.moduleId,
		featureId: spec.featureId,
		groupId,
		packagePath,
		groupPath,
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

const readGroupFeatureIds = async (
	repositoryRoot: string,
	groupPath: string,
): Promise<readonly string[]> => {
	if (!(await pathExists(repositoryRoot, groupPath))) {
		return Object.freeze([]);
	}
	const entries = await readdir(resolve(repositoryRoot, groupPath), {
		withFileTypes: true,
	});
	return Object.freeze(
		entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort(compareText),
	);
};

export const applyErpFeatureScaffold = async ({
	repositoryRoot,
	spec,
}: {
	readonly repositoryRoot: string;
	readonly spec: ErpFeatureScaffoldSpec;
}): Promise<ApplyErpFeatureScaffoldResult> => {
	const probe = createErpFeatureScaffoldPlan(spec);
	if (!(await pathExists(repositoryRoot, probe.packagePath))) {
		throw new ErpFeatureScaffoldError(
			`package does not exist: ${probe.packagePath}`,
		);
	}
	const existingGroupFeatureIds =
		probe.groupPath === null
			? Object.freeze([])
			: await readGroupFeatureIds(repositoryRoot, probe.groupPath);
	const plan = createErpFeatureScaffoldPlan(spec, { existingGroupFeatureIds });
	if (await pathExists(repositoryRoot, plan.featurePath)) {
		throw new ErpFeatureScaffoldError(
			`refusing to overwrite existing feature ${plan.featurePath}`,
		);
	}
	if (
		plan.groupId !== null &&
		(await pathExists(
			repositoryRoot,
			`${plan.packagePath}/src/features/${plan.featureId}`,
		))
	) {
		throw new ErpFeatureScaffoldError(
			`feature ${plan.featureId} already exists ungrouped in ${plan.packagePath}`,
		);
	}
	if (plan.groupPath !== null && existingGroupFeatureIds.length > 0) {
		const groupDefinitionPath = `${plan.groupPath}/${ERP_FEATURE_GROUP_DEFINITION_FILE}`;
		if (!(await pathExists(repositoryRoot, groupDefinitionPath))) {
			throw new ErpFeatureScaffoldError(
				`group ${plan.groupId} is missing its ${ERP_FEATURE_GROUP_DEFINITION_FILE} membership projection`,
			);
		}
		const current = await readFile(
			resolve(repositoryRoot, groupDefinitionPath),
			"utf8",
		);
		const expected = groupDefinition(
			plan.groupId ?? "",
			existingGroupFeatureIds,
		);
		if (current !== expected) {
			throw new ErpFeatureScaffoldError(
				`group ${plan.groupId} membership projection is hand-edited; regenerate ${groupDefinitionPath} before adding features`,
			);
		}
	}
	const transaction = await applyGeneratorFileTransaction({
		repositoryRoot,
		writes: plan.files.map((file) => ({
			path: file.path,
			contents: file.contents,
			policy: file.policy,
			...(file.expectedExistingContents === undefined
				? {}
				: { expectedExistingContents: file.expectedExistingContents }),
		})),
	});
	return Object.freeze({
		schema: ERP_FEATURE_SCAFFOLD_SCHEMA,
		featurePath: plan.featurePath,
		groupPath: plan.groupPath,
		writes: true,
		filesWritten: transaction.filesWritten,
	});
};
