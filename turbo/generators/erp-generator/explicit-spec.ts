import { stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

export const ERP_EXPLICIT_SPEC_SCHEMA = "afenda.erp-explicit-spec/v1" as const;

const MODULE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PACKAGE_NAME_PATTERN = /^@afenda\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OPERATION_ID_PATTERN =
	/^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PERMISSION_PATTERN =
	/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*(?:\.[a-z][a-z0-9_]*)+$/;
const PUBLIC_EXPORT_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const WINDOWS_DRIVE_PATH = /^[A-Za-z]:/;

export type ErpExplicitOperationKind = "command" | "query";

export interface ErpExplicitOperationSpec {
	readonly id: string;
	readonly kind: ErpExplicitOperationKind;
	readonly permission: string;
}

export interface ErpExplicitFeatureSpec {
	/**
	 * Optional feature-group classification. The group only classifies; the
	 * feature remains the sole semantic owner of its operations and contracts.
	 */
	readonly groupId?: string;
	readonly id: string;
	readonly operations: readonly ErpExplicitOperationSpec[];
	readonly publicExports: readonly string[];
}

export interface ErpCreatePackageSpec {
	readonly authorizedDependencies: readonly string[];
	readonly description: string;
	readonly features: readonly ErpExplicitFeatureSpec[];
	readonly kind: "create-package";
	readonly moduleId: string;
	readonly packageName: string;
}

export interface ErpAddFeatureSpec {
	readonly feature: ErpExplicitFeatureSpec;
	readonly kind: "add-feature";
	readonly moduleId: string;
}

export type ErpExplicitSpec = ErpAddFeatureSpec | ErpCreatePackageSpec;

export type ErpExplicitPlanActionKind =
	| "create-directory"
	| "create-file"
	| "update-file";

export interface ErpExplicitPlanAction {
	readonly kind: ErpExplicitPlanActionKind;
	readonly path: string;
}

export interface ErpExplicitPlan {
	readonly actions: readonly ErpExplicitPlanAction[];
	readonly kind: ErpExplicitSpec["kind"];
	readonly moduleId: string;
	readonly packagePath: string;
	readonly schema: typeof ERP_EXPLICIT_SPEC_SCHEMA;
}

export class ErpExplicitSpecError extends Error {
	readonly issues: readonly string[];

	constructor(issues: readonly string[]) {
		super(`ERP explicit spec is invalid:\n${issues.join("\n")}`);
		this.name = "ErpExplicitSpecError";
		this.issues = Object.freeze([...issues]);
	}
}

interface PlanExplicitSpecInput {
	readonly repositoryRoot: string;
	readonly spec: unknown;
}

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (
	value: unknown,
	path: string,
	issues: string[],
): string | undefined => {
	if (typeof value === "string" && value.length > 0 && value.trim() === value) {
		return value;
	}
	issues.push(
		`${path}: expected a non-empty string without surrounding whitespace`,
	);
};

const readStringArray = (
	value: unknown,
	path: string,
	issues: string[],
): readonly string[] => {
	if (!Array.isArray(value) || value.length === 0) {
		issues.push(`${path}: expected a non-empty string array`);
		return Object.freeze([]);
	}
	const values: string[] = [];
	for (const [index, item] of value.entries()) {
		const parsed = readString(item, `${path}[${index}]`, issues);
		if (parsed !== undefined) {
			values.push(parsed);
		}
	}
	return Object.freeze(values);
};

const rejectUnknownKeys = (
	record: Record<string, unknown>,
	allowed: readonly string[],
	path: string,
	issues: string[],
): void => {
	const allowedKeys = new Set(allowed);
	for (const key of Object.keys(record)) {
		if (!allowedKeys.has(key)) {
			issues.push(`${path}.${key}: unknown key`);
		}
	}
};

const assertPattern = (
	value: string | undefined,
	pattern: RegExp,
	path: string,
	issues: string[],
): void => {
	if (value !== undefined && !pattern.test(value)) {
		issues.push(`${path}: invalid value '${value}'`);
	}
};

const assertNoCaseCollision = (
	values: readonly string[],
	path: string,
	issues: string[],
): void => {
	const seen = new Map<string, string>();
	for (const value of values) {
		const key = value.toLowerCase();
		const existing = seen.get(key);
		if (existing !== undefined && existing !== value) {
			issues.push(
				`${path}: case collision between '${existing}' and '${value}'`,
			);
		}
		seen.set(key, value);
	}
};

const assertSafeRelativePathSegment = (
	value: string | undefined,
	path: string,
	issues: string[],
): void => {
	if (
		value !== undefined &&
		(isAbsolute(value) ||
			WINDOWS_DRIVE_PATH.test(value) ||
			value.includes("/") ||
			value.includes("\\") ||
			value === "." ||
			value === "..")
	) {
		issues.push(`${path}: value must be a safe relative path segment`);
	}
};

const parseOperation = (
	value: unknown,
	path: string,
	issues: string[],
): ErpExplicitOperationSpec | undefined => {
	if (!isRecord(value)) {
		issues.push(`${path}: expected an operation object`);
		return;
	}
	rejectUnknownKeys(value, ["id", "kind", "permission"], path, issues);
	const id = readString(value.id, `${path}.id`, issues);
	const kind = readString(value.kind, `${path}.kind`, issues);
	const permission = readString(value.permission, `${path}.permission`, issues);
	assertPattern(id, OPERATION_ID_PATTERN, `${path}.id`, issues);
	if (kind !== undefined && kind !== "command" && kind !== "query") {
		issues.push(`${path}.kind: expected command or query`);
	}
	assertPattern(permission, PERMISSION_PATTERN, `${path}.permission`, issues);
	if (id === undefined || kind === undefined || permission === undefined) {
		return;
	}
	if (kind !== "command" && kind !== "query") {
		return;
	}
	return Object.freeze({ id, kind, permission });
};

const parseFeature = (
	value: unknown,
	path: string,
	issues: string[],
): ErpExplicitFeatureSpec | undefined => {
	if (!isRecord(value)) {
		issues.push(`${path}: expected a feature object`);
		return;
	}
	rejectUnknownKeys(
		value,
		["groupId", "id", "operations", "publicExports"],
		path,
		issues,
	);
	const id = readString(value.id, `${path}.id`, issues);
	assertPattern(id, MODULE_ID_PATTERN, `${path}.id`, issues);
	assertSafeRelativePathSegment(id, `${path}.id`, issues);
	let groupId: string | undefined;
	if (value.groupId !== undefined) {
		groupId = readString(value.groupId, `${path}.groupId`, issues);
		assertPattern(groupId, MODULE_ID_PATTERN, `${path}.groupId`, issues);
		assertSafeRelativePathSegment(groupId, `${path}.groupId`, issues);
		if (groupId !== undefined && groupId === id) {
			issues.push(`${path}.groupId: must differ from the feature id`);
		}
	}
	const operations = Array.isArray(value.operations)
		? value.operations
				.map((operation, index) =>
					parseOperation(operation, `${path}.operations[${index}]`, issues),
				)
				.filter((operation) => operation !== undefined)
		: [];
	if (!Array.isArray(value.operations) || value.operations.length === 0) {
		issues.push(`${path}.operations: expected at least one operation`);
	}
	const publicExports = readStringArray(
		value.publicExports,
		`${path}.publicExports`,
		issues,
	);
	for (const [index, publicExport] of publicExports.entries()) {
		assertPattern(
			publicExport,
			PUBLIC_EXPORT_PATTERN,
			`${path}.publicExports[${index}]`,
			issues,
		);
	}
	assertNoCaseCollision(
		operations.map((operation) => operation.id),
		`${path}.operations`,
		issues,
	);
	assertNoCaseCollision(publicExports, `${path}.publicExports`, issues);
	if (id === undefined) {
		return;
	}
	return Object.freeze({
		id,
		...(groupId === undefined ? {} : { groupId }),
		operations: Object.freeze(operations),
		publicExports,
	});
};

const featureRelativePath = (feature: ErpExplicitFeatureSpec): string =>
	feature.groupId === undefined
		? `src/features/${feature.id}`
		: `src/features/${feature.groupId}/${feature.id}`;

const parseCreatePackageSpec = (
	input: Record<string, unknown>,
	issues: string[],
): ErpCreatePackageSpec => {
	rejectUnknownKeys(
		input,
		[
			"kind",
			"moduleId",
			"packageName",
			"description",
			"features",
			"authorizedDependencies",
		],
		"spec",
		issues,
	);
	const moduleId = readString(input.moduleId, "spec.moduleId", issues);
	const packageName = readString(input.packageName, "spec.packageName", issues);
	const description = readString(input.description, "spec.description", issues);
	assertPattern(moduleId, MODULE_ID_PATTERN, "spec.moduleId", issues);
	assertSafeRelativePathSegment(moduleId, "spec.moduleId", issues);
	assertPattern(packageName, PACKAGE_NAME_PATTERN, "spec.packageName", issues);
	if (
		moduleId !== undefined &&
		packageName !== undefined &&
		packageName !== `@afenda/${moduleId}`
	) {
		issues.push("spec.packageName: package name must match moduleId");
	}
	const features = Array.isArray(input.features)
		? input.features
				.map((feature, index) =>
					parseFeature(feature, `spec.features[${index}]`, issues),
				)
				.filter((feature) => feature !== undefined)
		: [];
	if (!Array.isArray(input.features) || input.features.length === 0) {
		issues.push("spec.features: expected at least one feature");
	}
	const authorizedDependencies = readStringArray(
		input.authorizedDependencies,
		"spec.authorizedDependencies",
		issues,
	);
	for (const [index, dependency] of authorizedDependencies.entries()) {
		assertPattern(
			dependency,
			PACKAGE_NAME_PATTERN,
			`spec.authorizedDependencies[${index}]`,
			issues,
		);
	}
	assertNoCaseCollision(
		features.map((feature) => feature.id),
		"spec.features",
		issues,
	);
	// A group and a feature both occupy a directory directly under src/features,
	// so a shared name would make the layout ambiguous.
	const groupIds = new Set(
		features
			.map((feature) => feature.groupId)
			.filter((groupId) => groupId !== undefined),
	);
	for (const feature of features) {
		if (feature.groupId === undefined && groupIds.has(feature.id)) {
			issues.push(
				`spec.features: ungrouped feature '${feature.id}' collides with a feature group of the same name`,
			);
		}
	}
	if (issues.length > 0) {
		throw new ErpExplicitSpecError(issues);
	}
	return Object.freeze({
		kind: "create-package",
		moduleId: moduleId ?? "",
		packageName: packageName ?? "",
		description: description ?? "",
		features: Object.freeze(features),
		authorizedDependencies,
	});
};

const parseAddFeatureSpec = (
	input: Record<string, unknown>,
	issues: string[],
): ErpAddFeatureSpec => {
	rejectUnknownKeys(input, ["kind", "moduleId", "feature"], "spec", issues);
	const moduleId = readString(input.moduleId, "spec.moduleId", issues);
	assertPattern(moduleId, MODULE_ID_PATTERN, "spec.moduleId", issues);
	assertSafeRelativePathSegment(moduleId, "spec.moduleId", issues);
	const feature = parseFeature(input.feature, "spec.feature", issues);
	if (issues.length > 0) {
		throw new ErpExplicitSpecError(issues);
	}
	if (feature === undefined) {
		throw new ErpExplicitSpecError(["spec.feature: expected a feature object"]);
	}
	return Object.freeze({
		kind: "add-feature",
		moduleId: moduleId ?? "",
		feature,
	});
};

export const parseErpExplicitSpec = (input: unknown): ErpExplicitSpec => {
	const issues: string[] = [];
	if (!isRecord(input)) {
		throw new ErpExplicitSpecError(["spec: expected an object"]);
	}
	const kind = readString(input.kind, "spec.kind", issues);
	if (kind !== "create-package" && kind !== "add-feature") {
		issues.push("spec.kind: expected create-package or add-feature");
	}
	if (kind === "create-package") {
		return parseCreatePackageSpec(input, issues);
	}
	if (kind === "add-feature") {
		return parseAddFeatureSpec(input, issues);
	}
	throw new ErpExplicitSpecError(issues);
};

const packagePathFor = (moduleId: string): string => `packages/erp/${moduleId}`;

const exists = async (
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

const action = (
	kind: ErpExplicitPlanActionKind,
	path: string,
): ErpExplicitPlanAction => Object.freeze({ kind, path });

const createPackageActions = (spec: ErpCreatePackageSpec) => {
	const packagePath = packagePathFor(spec.moduleId);
	const groupActions = [
		...new Set(
			spec.features
				.map((feature) => feature.groupId)
				.filter((groupId) => groupId !== undefined),
		),
	].flatMap((groupId) => [
		action("create-directory", `${packagePath}/src/features/${groupId}`),
		action(
			"create-file",
			`${packagePath}/src/features/${groupId}/group.definition.ts`,
		),
	]);
	const featureActions = spec.features.flatMap((feature) => {
		const featurePath = `${packagePath}/${featureRelativePath(feature)}`;
		return [
			action("create-directory", featurePath),
			action("create-file", `${featurePath}/index.ts`),
			action("create-file", `${featurePath}/operation-registry.ts`),
		];
	});
	return Object.freeze(
		[
			action("create-directory", packagePath),
			action("create-file", `${packagePath}/package.json`),
			action("create-file", `${packagePath}/src/index.ts`),
			action(
				"create-file",
				`${packagePath}/src/composition/module.manifest.ts`,
			),
			...groupActions,
			...featureActions,
			action(
				"create-file",
				`${packagePath}/__tests__/package-contract.test.ts`,
			),
		].sort((left, right) => compareText(left.path, right.path)),
	);
};

const addFeatureActions = (spec: ErpAddFeatureSpec) => {
	const packagePath = packagePathFor(spec.moduleId);
	const featurePath = `${packagePath}/${featureRelativePath(spec.feature)}`;
	const groupActions =
		spec.feature.groupId === undefined
			? []
			: [
					action(
						"update-file",
						`${packagePath}/src/features/${spec.feature.groupId}/group.definition.ts`,
					),
				];
	return Object.freeze(
		[
			action("create-directory", featurePath),
			action("create-file", `${featurePath}/index.ts`),
			action("create-file", `${featurePath}/operation-registry.ts`),
			...groupActions,
			action("update-file", `${packagePath}/src/index.ts`),
			action(
				"update-file",
				`${packagePath}/src/composition/module.manifest.ts`,
			),
			action(
				"create-file",
				`${packagePath}/__tests__/${spec.feature.id}.test.ts`,
			),
		].sort((left, right) => compareText(left.path, right.path)),
	);
};

export const planErpExplicitSpec = async ({
	repositoryRoot,
	spec: input,
}: PlanExplicitSpecInput): Promise<ErpExplicitPlan> => {
	const spec = parseErpExplicitSpec(input);
	const packagePath = packagePathFor(spec.moduleId);
	const issues: string[] = [];
	if (spec.kind === "create-package") {
		if (await exists(repositoryRoot, packagePath)) {
			issues.push(`spec.moduleId: package already exists at ${packagePath}`);
		}
		if (issues.length > 0) {
			throw new ErpExplicitSpecError(issues);
		}
		return Object.freeze({
			schema: ERP_EXPLICIT_SPEC_SCHEMA,
			kind: spec.kind,
			moduleId: spec.moduleId,
			packagePath,
			actions: createPackageActions(spec),
		});
	}
	if (!(await exists(repositoryRoot, packagePath))) {
		issues.push(`spec.moduleId: package does not exist at ${packagePath}`);
	}
	const featurePath = `${packagePath}/${featureRelativePath(spec.feature)}`;
	if (await exists(repositoryRoot, featurePath)) {
		issues.push(`spec.feature.id: feature already exists at ${featurePath}`);
	}
	// A feature owns its semantics exactly once, so the same id must not exist
	// both grouped and ungrouped.
	const ungroupedPath = `${packagePath}/src/features/${spec.feature.id}`;
	if (
		spec.feature.groupId !== undefined &&
		(await exists(repositoryRoot, ungroupedPath))
	) {
		issues.push(
			`spec.feature.id: feature already exists ungrouped at ${ungroupedPath}`,
		);
	}
	if (issues.length > 0) {
		throw new ErpExplicitSpecError(issues);
	}
	return Object.freeze({
		schema: ERP_EXPLICIT_SPEC_SCHEMA,
		kind: spec.kind,
		moduleId: spec.moduleId,
		packagePath,
		actions: addFeatureActions(spec),
	});
};
