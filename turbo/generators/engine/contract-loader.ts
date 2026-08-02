import type {
	ContractCapabilityDefinition,
	ContractRelease,
	DependencyPolicy,
	DiagnosticDefinition,
	DiagnosticSeverity,
	DiagnosticTreatment,
	EntrypointPolicy,
	FileDispositionDefinition,
	FileDispositionKind,
	GeneratorContractRegistry,
	GeneratorFamily,
	GeneratorFamilyContractDefinition,
	GeneratorModeDefinition,
	GeneratorModeId,
	GeneratorProfileDefinition,
	MigrationDefinition,
	NamingPolicy,
	PathPolicy,
	ProjectionCompliance,
	ProjectionDefinition,
	SemanticInputPolicy,
	TaskPolicy,
} from "./types.ts";

export type ContractValidationIssueCode =
	| "AFG-CONTRACT-001"
	| "AFG-CONTRACT-002"
	| "AFG-CONTRACT-003"
	| "AFG-CONTRACT-004"
	| "AFG-CONTRACT-005"
	| "AFG-CONTRACT-006"
	| "AFG-CONTRACT-007"
	| "AFG-CONTRACT-008"
	| "AFG-CONTRACT-009"
	| "AFG-CONTRACT-010"
	| "AFG-CONTRACT-011";

export interface ContractValidationIssue {
	readonly code: ContractValidationIssueCode;
	readonly message: string;
	readonly path: string;
}

interface ValidationContext {
	readonly issues: ContractValidationIssue[];
}

const GENERATOR_FAMILIES = [
	"kernel",
	"erp",
] satisfies readonly GeneratorFamily[];

const GENERATOR_MODE_IDS = [
	"create",
	"add-feature",
	"doctor",
	"plan-upgrade",
	"reconcile",
	"upgrade",
	"project",
	"verify",
] satisfies readonly GeneratorModeId[];

const FILE_DISPOSITIONS = [
	"managed",
	"projected",
	"patched",
	"canonical",
	"unmanaged",
] satisfies readonly FileDispositionKind[];

const PROJECTION_COMPLIANCE = [
	"normative",
	"informational",
] satisfies readonly ProjectionCompliance[];

const DIAGNOSTIC_SEVERITIES = [
	"info",
	"warning",
	"error",
	"blocked",
] satisfies readonly DiagnosticSeverity[];

const DIAGNOSTIC_TREATMENTS = [
	"auto-reconcile",
	"auto-upgrade",
	"auto-regenerate",
	"remove-superseded",
	"semantic-decision-required",
	"collision",
	"unsupported",
] satisfies readonly DiagnosticTreatment[];

const CONTRACT_KEYS = [
	"family",
	"release",
	"engineCompatibility",
	"modes",
	"capabilities",
	"profiles",
	"semanticInput",
	"pathPolicy",
	"filePolicy",
	"namingPolicy",
	"entrypointPolicy",
	"dependencyPolicy",
	"taskPolicy",
	"projections",
	"diagnostics",
	"migrations",
] as const;

const WINDOWS_DRIVE_PATH = /^[A-Za-z]:/;
const ASCII_CONTROL_MAX = 31;
const ASCII_DELETE = 127;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isUnknownArray = (value: unknown): value is readonly unknown[] =>
	Array.isArray(value);

const containsControlCharacter = (value: string): boolean => {
	for (const character of value) {
		const characterCode = character.charCodeAt(0);
		if (characterCode <= ASCII_CONTROL_MAX || characterCode === ASCII_DELETE) {
			return true;
		}
	}
	return false;
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

const addIssue = (
	context: ValidationContext,
	code: ContractValidationIssueCode,
	path: string,
	message: string,
): void => {
	context.issues.push({ code, path, message });
};

const readRecord = (
	value: unknown,
	path: string,
	context: ValidationContext,
): Record<string, unknown> | undefined => {
	if (isRecord(value)) {
		return value;
	}
	addIssue(context, "AFG-CONTRACT-001", path, "expected an object");
};

const readArray = (
	value: unknown,
	path: string,
	context: ValidationContext,
): readonly unknown[] => {
	if (isUnknownArray(value)) {
		return value;
	}
	addIssue(context, "AFG-CONTRACT-001", path, "expected an array");
	return [];
};

const readString = (
	value: unknown,
	path: string,
	context: ValidationContext,
): string | undefined => {
	if (typeof value === "string" && value.length > 0 && value.trim() === value) {
		return value;
	}
	addIssue(
		context,
		"AFG-CONTRACT-001",
		path,
		"expected a non-empty string without surrounding whitespace",
	);
};

const readBoolean = (
	value: unknown,
	path: string,
	context: ValidationContext,
): boolean | undefined => {
	if (typeof value === "boolean") {
		return value;
	}
	addIssue(context, "AFG-CONTRACT-001", path, "expected a boolean");
};

const readPositiveInteger = (
	value: unknown,
	path: string,
	context: ValidationContext,
): number | undefined => {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}
	addIssue(context, "AFG-CONTRACT-001", path, "expected a positive integer");
};

const readEnum = <T extends string>(
	value: unknown,
	allowed: readonly T[],
	path: string,
	context: ValidationContext,
): T | undefined => {
	if (typeof value === "string") {
		for (const candidate of allowed) {
			if (candidate === value) {
				return candidate;
			}
		}
	}
	addIssue(
		context,
		"AFG-CONTRACT-001",
		path,
		`expected one of: ${allowed.join(", ")}`,
	);
};

const rejectUnknownKeys = (
	record: Record<string, unknown>,
	allowed: readonly string[],
	path: string,
	context: ValidationContext,
): void => {
	const allowedKeys = new Set(allowed);
	for (const key of Object.keys(record).sort()) {
		if (!allowedKeys.has(key)) {
			addIssue(
				context,
				"AFG-CONTRACT-002",
				`${path}.${key}`,
				"unknown contract field",
			);
		}
	}
};

const parseList = <T>(
	value: unknown,
	path: string,
	context: ValidationContext,
	parseItem: (
		item: unknown,
		itemPath: string,
		itemContext: ValidationContext,
	) => T | undefined,
): readonly T[] => {
	const result: T[] = [];
	const input = readArray(value, path, context);
	for (const [index, item] of input.entries()) {
		const parsed = parseItem(item, `${path}[${index}]`, context);
		if (parsed !== undefined) {
			result.push(parsed);
		}
	}
	return Object.freeze(result);
};

const parseStringList = (
	value: unknown,
	path: string,
	context: ValidationContext,
	allowEmpty: boolean,
): readonly string[] => {
	const values = parseList(value, path, context, readString);
	if (!allowEmpty && values.length === 0) {
		addIssue(context, "AFG-CONTRACT-001", path, "expected at least one entry");
	}
	return values;
};

const parseRelease = (
	value: unknown,
	path: string,
	context: ValidationContext,
): ContractRelease | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	const state = readEnum(
		record.state,
		["internal", "authoritative"],
		`${path}.state`,
		context,
	);
	if (state === "internal") {
		rejectUnknownKeys(record, ["state"], path, context);
		return Object.freeze({ state });
	}
	if (state === "authoritative") {
		rejectUnknownKeys(record, ["state", "version"], path, context);
		const version = readPositiveInteger(
			record.version,
			`${path}.version`,
			context,
		);
		return version === undefined
			? undefined
			: Object.freeze({ state, version });
	}
};

const parseMode = (
	value: unknown,
	path: string,
	context: ValidationContext,
): GeneratorModeDefinition | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, ["id", "writes"], path, context);
	const id = readEnum(record.id, GENERATOR_MODE_IDS, `${path}.id`, context);
	const writes = readBoolean(record.writes, `${path}.writes`, context);
	return id === undefined || writes === undefined
		? undefined
		: Object.freeze({ id, writes });
};

const parseCapability = (
	value: unknown,
	path: string,
	context: ValidationContext,
): ContractCapabilityDefinition | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	const status = readEnum(
		record.status,
		["declared", "authoritative"],
		`${path}.status`,
		context,
	);
	const id = readString(record.id, `${path}.id`, context);
	if (status === "declared") {
		rejectUnknownKeys(record, ["id", "status"], path, context);
		return id === undefined ? undefined : Object.freeze({ id, status });
	}
	if (status === "authoritative") {
		rejectUnknownKeys(
			record,
			["id", "status", "authorityVersion"],
			path,
			context,
		);
		const authorityVersion = readPositiveInteger(
			record.authorityVersion,
			`${path}.authorityVersion`,
			context,
		);
		return id === undefined || authorityVersion === undefined
			? undefined
			: Object.freeze({ id, status, authorityVersion });
	}
};

const parseProfile = (
	value: unknown,
	path: string,
	context: ValidationContext,
): GeneratorProfileDefinition | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, ["id"], path, context);
	const id = readString(record.id, `${path}.id`, context);
	return id === undefined ? undefined : Object.freeze({ id });
};

const parseSemanticInput = (
	value: unknown,
	path: string,
	context: ValidationContext,
): SemanticInputPolicy | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, ["adapter", "canonicalOwners"], path, context);
	const adapter = readString(record.adapter, `${path}.adapter`, context);
	const canonicalOwners = parseStringList(
		record.canonicalOwners,
		`${path}.canonicalOwners`,
		context,
		false,
	);
	return adapter === undefined
		? undefined
		: Object.freeze({ adapter, canonicalOwners });
};

const parsePathPolicy = (
	value: unknown,
	path: string,
	context: ValidationContext,
): PathPolicy | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, ["workspaceRoots"], path, context);
	const workspaceRoots = parseStringList(
		record.workspaceRoots,
		`${path}.workspaceRoots`,
		context,
		false,
	);
	return Object.freeze({ workspaceRoots });
};

const parseFileDisposition = (
	value: unknown,
	path: string,
	context: ValidationContext,
): FileDispositionDefinition | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(
		record,
		["path", "disposition", "owner", "capability"],
		path,
		context,
	);
	const filePath = readString(record.path, `${path}.path`, context);
	const disposition = readEnum(
		record.disposition,
		FILE_DISPOSITIONS,
		`${path}.disposition`,
		context,
	);
	const owner = readString(record.owner, `${path}.owner`, context);
	const capability = readString(
		record.capability,
		`${path}.capability`,
		context,
	);
	return filePath === undefined ||
		disposition === undefined ||
		owner === undefined ||
		capability === undefined
		? undefined
		: Object.freeze({
				path: filePath,
				disposition,
				owner,
				capability,
			});
};

const parseNamingPolicy = (
	value: unknown,
	path: string,
	context: ValidationContext,
): NamingPolicy | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, ["directories", "files"], path, context);
	const directories = readEnum(
		record.directories,
		["kebab-case"],
		`${path}.directories`,
		context,
	);
	const files = readEnum(
		record.files,
		["kebab-case"],
		`${path}.files`,
		context,
	);
	return directories === undefined || files === undefined
		? undefined
		: Object.freeze({ directories, files });
};

const parseEntrypointPolicy = (
	value: unknown,
	path: string,
	context: ValidationContext,
): EntrypointPolicy | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, ["root", "auxiliary"], path, context);
	const root = readString(record.root, `${path}.root`, context);
	const auxiliary = parseStringList(
		record.auxiliary,
		`${path}.auxiliary`,
		context,
		true,
	);
	return root === undefined ? undefined : Object.freeze({ root, auxiliary });
};

const parseDependencyPolicy = (
	value: unknown,
	path: string,
	context: ValidationContext,
): DependencyPolicy | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(
		record,
		["authorizationOwner", "discoveryAuthorizes"],
		path,
		context,
	);
	const authorizationOwner = readString(
		record.authorizationOwner,
		`${path}.authorizationOwner`,
		context,
	);
	const discoveryAuthorizes = readBoolean(
		record.discoveryAuthorizes,
		`${path}.discoveryAuthorizes`,
		context,
	);
	if (discoveryAuthorizes === true) {
		addIssue(
			context,
			"AFG-CONTRACT-008",
			`${path}.discoveryAuthorizes`,
			"workspace discovery must not authorize dependencies",
		);
	}
	return authorizationOwner === undefined || discoveryAuthorizes !== false
		? undefined
		: Object.freeze({ authorizationOwner, discoveryAuthorizes });
};

const parseTaskPolicy = (
	value: unknown,
	path: string,
	context: ValidationContext,
): TaskPolicy | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, ["requiredScripts"], path, context);
	const requiredScripts = parseStringList(
		record.requiredScripts,
		`${path}.requiredScripts`,
		context,
		true,
	);
	return Object.freeze({ requiredScripts });
};

const parseProjection = (
	value: unknown,
	path: string,
	context: ValidationContext,
): ProjectionDefinition | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(
		record,
		["id", "path", "compliance", "capability", "canonicalInputs"],
		path,
		context,
	);
	const id = readString(record.id, `${path}.id`, context);
	const projectionPath = readString(record.path, `${path}.path`, context);
	const compliance = readEnum(
		record.compliance,
		PROJECTION_COMPLIANCE,
		`${path}.compliance`,
		context,
	);
	const capability = readString(
		record.capability,
		`${path}.capability`,
		context,
	);
	const canonicalInputs = parseStringList(
		record.canonicalInputs,
		`${path}.canonicalInputs`,
		context,
		false,
	);
	if (compliance === undefined) {
		addIssue(
			context,
			"AFG-CONTRACT-006",
			`${path}.compliance`,
			"every projection requires an explicit compliance class",
		);
	}
	return id === undefined ||
		projectionPath === undefined ||
		compliance === undefined ||
		capability === undefined
		? undefined
		: Object.freeze({
				id,
				path: projectionPath,
				compliance,
				capability,
				canonicalInputs,
			});
};

const parseDiagnostic = (
	value: unknown,
	path: string,
	context: ValidationContext,
): DiagnosticDefinition | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(
		record,
		["code", "severity", "treatment", "capability"],
		path,
		context,
	);
	const code = readString(record.code, `${path}.code`, context);
	const severity = readEnum(
		record.severity,
		DIAGNOSTIC_SEVERITIES,
		`${path}.severity`,
		context,
	);
	const treatment = readEnum(
		record.treatment,
		DIAGNOSTIC_TREATMENTS,
		`${path}.treatment`,
		context,
	);
	const capability = readString(
		record.capability,
		`${path}.capability`,
		context,
	);
	if (treatment === undefined) {
		addIssue(
			context,
			"AFG-CONTRACT-011",
			`${path}.treatment`,
			"every diagnostic requires a treatment",
		);
	}
	return code === undefined ||
		severity === undefined ||
		treatment === undefined ||
		capability === undefined
		? undefined
		: Object.freeze({ code, severity, treatment, capability });
};

const parseMigration = (
	value: unknown,
	path: string,
	context: ValidationContext,
): MigrationDefinition | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, ["id", "from", "to"], path, context);
	const id = readString(record.id, `${path}.id`, context);
	const from = readPositiveInteger(record.from, `${path}.from`, context);
	const to = readPositiveInteger(record.to, `${path}.to`, context);
	return id === undefined || from === undefined || to === undefined
		? undefined
		: Object.freeze({ id, from, to });
};

const parseFamilyContract = (
	value: unknown,
	path: string,
	context: ValidationContext,
): GeneratorFamilyContractDefinition | undefined => {
	const record = readRecord(value, path, context);
	if (record === undefined) {
		return;
	}
	rejectUnknownKeys(record, CONTRACT_KEYS, path, context);

	const family = readEnum(
		record.family,
		GENERATOR_FAMILIES,
		`${path}.family`,
		context,
	);
	const release = parseRelease(record.release, `${path}.release`, context);
	const engineCompatibility = readPositiveInteger(
		record.engineCompatibility,
		`${path}.engineCompatibility`,
		context,
	);
	const modes = parseList(record.modes, `${path}.modes`, context, parseMode);
	const capabilities = parseList(
		record.capabilities,
		`${path}.capabilities`,
		context,
		parseCapability,
	);
	const profiles = parseList(
		record.profiles,
		`${path}.profiles`,
		context,
		parseProfile,
	);
	const semanticInput = parseSemanticInput(
		record.semanticInput,
		`${path}.semanticInput`,
		context,
	);
	const pathPolicy = parsePathPolicy(
		record.pathPolicy,
		`${path}.pathPolicy`,
		context,
	);
	const filePolicy = parseList(
		record.filePolicy,
		`${path}.filePolicy`,
		context,
		parseFileDisposition,
	);
	const namingPolicy = parseNamingPolicy(
		record.namingPolicy,
		`${path}.namingPolicy`,
		context,
	);
	const entrypointPolicy = parseEntrypointPolicy(
		record.entrypointPolicy,
		`${path}.entrypointPolicy`,
		context,
	);
	const dependencyPolicy = parseDependencyPolicy(
		record.dependencyPolicy,
		`${path}.dependencyPolicy`,
		context,
	);
	const taskPolicy = parseTaskPolicy(
		record.taskPolicy,
		`${path}.taskPolicy`,
		context,
	);
	const projections = parseList(
		record.projections,
		`${path}.projections`,
		context,
		parseProjection,
	);
	const diagnostics = parseList(
		record.diagnostics,
		`${path}.diagnostics`,
		context,
		parseDiagnostic,
	);
	const migrations = parseList(
		record.migrations,
		`${path}.migrations`,
		context,
		parseMigration,
	);
	if (modes.length === 0) {
		addIssue(
			context,
			"AFG-CONTRACT-001",
			`${path}.modes`,
			"expected at least one active mode",
		);
	}
	if (capabilities.length === 0) {
		addIssue(
			context,
			"AFG-CONTRACT-001",
			`${path}.capabilities`,
			"expected at least one capability",
		);
	}
	if (profiles.length === 0) {
		addIssue(
			context,
			"AFG-CONTRACT-001",
			`${path}.profiles`,
			"expected at least one profile",
		);
	}

	if (
		family === undefined ||
		release === undefined ||
		engineCompatibility === undefined ||
		semanticInput === undefined ||
		pathPolicy === undefined ||
		namingPolicy === undefined ||
		entrypointPolicy === undefined ||
		dependencyPolicy === undefined ||
		taskPolicy === undefined
	) {
		return;
	}

	return Object.freeze({
		family,
		release,
		engineCompatibility,
		modes,
		capabilities,
		profiles,
		semanticInput,
		pathPolicy,
		filePolicy,
		namingPolicy,
		entrypointPolicy,
		dependencyPolicy,
		taskPolicy,
		projections,
		diagnostics,
		migrations,
	});
};

const checkDuplicate = <T>(
	items: readonly T[],
	keyOf: (item: T) => string,
	path: string,
	label: string,
	context: ValidationContext,
	code: ContractValidationIssueCode = "AFG-CONTRACT-003",
): void => {
	const firstIndex = new Map<string, number>();
	for (const [index, item] of items.entries()) {
		const key = keyOf(item);
		const previous = firstIndex.get(key);
		if (previous === undefined) {
			firstIndex.set(key, index);
			continue;
		}
		addIssue(
			context,
			code,
			`${path}[${index}]`,
			`duplicate ${label} '${key}' (first declared at ${path}[${previous}])`,
		);
	}
};

const checkDuplicateStrings = (
	items: readonly string[],
	path: string,
	label: string,
	context: ValidationContext,
	code: ContractValidationIssueCode = "AFG-CONTRACT-003",
): void => {
	checkDuplicate(items, (item) => item, path, label, context, code);
};

const validateRelativeContractPath = (
	value: string,
	path: string,
	context: ValidationContext,
): void => {
	const segments = value.split("/");
	if (
		value.includes("\\") ||
		value.startsWith("/") ||
		WINDOWS_DRIVE_PATH.test(value) ||
		containsControlCharacter(value) ||
		segments.some(
			(segment) => segment === "" || segment === "." || segment === "..",
		)
	) {
		addIssue(
			context,
			"AFG-CONTRACT-010",
			path,
			"expected a normalized repository-relative POSIX path",
		);
	}
};

const validateMigrationChain = (
	contract: GeneratorFamilyContractDefinition,
	path: string,
	context: ValidationContext,
): void => {
	checkDuplicate(
		contract.migrations,
		(item) => item.id,
		`${path}.migrations`,
		"migration id",
		context,
	);
	if (contract.release.state === "internal") {
		if (contract.migrations.length > 0) {
			addIssue(
				context,
				"AFG-CONTRACT-007",
				`${path}.migrations`,
				"an internal contract cannot publish migrations",
			);
		}
		return;
	}

	const expectedMigrationCount = contract.release.version - 1;
	if (contract.migrations.length !== expectedMigrationCount) {
		addIssue(
			context,
			"AFG-CONTRACT-007",
			`${path}.migrations`,
			`contract version ${contract.release.version} requires ${expectedMigrationCount} contiguous migration(s)`,
		);
	}
	const migrationsByFrom = new Map<number, MigrationDefinition>();
	for (const [index, migration] of contract.migrations.entries()) {
		if (migration.to !== migration.from + 1) {
			addIssue(
				context,
				"AFG-CONTRACT-007",
				`${path}.migrations[${index}]`,
				"migration must advance exactly one contract version",
			);
		}
		if (migrationsByFrom.has(migration.from)) {
			addIssue(
				context,
				"AFG-CONTRACT-007",
				`${path}.migrations[${index}].from`,
				`multiple migrations start at version ${migration.from}`,
			);
		} else {
			migrationsByFrom.set(migration.from, migration);
		}
	}
	for (let from = 1; from < contract.release.version; from += 1) {
		const migration = migrationsByFrom.get(from);
		if (migration === undefined || migration.to !== from + 1) {
			addIssue(
				context,
				"AFG-CONTRACT-007",
				`${path}.migrations`,
				`missing contiguous migration ${from} -> ${from + 1}`,
			);
		}
	}
};

const validateAuthorityActivation = (
	contract: GeneratorFamilyContractDefinition,
	path: string,
	context: ValidationContext,
): void => {
	const authoritativeCapabilities = contract.capabilities.filter(
		(capability) => capability.status === "authoritative",
	);
	if (
		contract.release.state === "authoritative" &&
		authoritativeCapabilities.length === 0
	) {
		addIssue(
			context,
			"AFG-CONTRACT-008",
			`${path}.capabilities`,
			"an authoritative release requires at least one authoritative capability",
		);
	}
	for (const [index, capability] of contract.capabilities.entries()) {
		if (capability.status !== "authoritative") {
			continue;
		}
		if (contract.release.state === "internal") {
			addIssue(
				context,
				"AFG-CONTRACT-008",
				`${path}.capabilities[${index}]`,
				"an internal contract cannot activate package authority",
			);
		} else if (capability.authorityVersion > contract.release.version) {
			addIssue(
				context,
				"AFG-CONTRACT-008",
				`${path}.capabilities[${index}].authorityVersion`,
				"authority version exceeds the released family version",
			);
		}
	}
	if (contract.release.state !== "internal") {
		return;
	}
	for (const [index, mode] of contract.modes.entries()) {
		if (mode.writes) {
			addIssue(
				context,
				"AFG-CONTRACT-008",
				`${path}.modes[${index}]`,
				"an internal contract cannot expose a mutating mode",
			);
		}
	}
};

const validateCapabilityReference = (
	capabilityIds: ReadonlySet<string>,
	capability: string,
	referencePath: string,
	context: ValidationContext,
): void => {
	if (!capabilityIds.has(capability)) {
		addIssue(
			context,
			"AFG-CONTRACT-005",
			referencePath,
			`unknown capability '${capability}'`,
		);
	}
};

const validateFileAndProjectionPolicy = (
	contract: GeneratorFamilyContractDefinition,
	path: string,
	capabilityIds: ReadonlySet<string>,
	context: ValidationContext,
): void => {
	for (const [index, file] of contract.filePolicy.entries()) {
		validateRelativeContractPath(
			file.path,
			`${path}.filePolicy[${index}].path`,
			context,
		);
		validateCapabilityReference(
			capabilityIds,
			file.capability,
			`${path}.filePolicy[${index}].capability`,
			context,
		);
	}
	const projectedFilePaths = new Set(
		contract.filePolicy
			.filter((file) => file.disposition === "projected")
			.map((file) => file.path),
	);
	const canonicalFilePaths = new Set(
		contract.filePolicy
			.filter((file) => file.disposition === "canonical")
			.map((file) => file.path),
	);
	const projectionPaths = new Set(
		contract.projections.map((projection) => projection.path),
	);
	for (const [index, projection] of contract.projections.entries()) {
		validateRelativeContractPath(
			projection.path,
			`${path}.projections[${index}].path`,
			context,
		);
		validateCapabilityReference(
			capabilityIds,
			projection.capability,
			`${path}.projections[${index}].capability`,
			context,
		);
		if (!projectedFilePaths.has(projection.path)) {
			addIssue(
				context,
				"AFG-CONTRACT-006",
				`${path}.projections[${index}].path`,
				"projection path must have one projected file disposition",
			);
		}
		for (const [
			inputIndex,
			canonicalInput,
		] of projection.canonicalInputs.entries()) {
			validateRelativeContractPath(
				canonicalInput,
				`${path}.projections[${index}].canonicalInputs[${inputIndex}]`,
				context,
			);
			if (!canonicalFilePaths.has(canonicalInput)) {
				addIssue(
					context,
					"AFG-CONTRACT-006",
					`${path}.projections[${index}].canonicalInputs[${inputIndex}]`,
					"projection input must have one canonical file disposition",
				);
			}
		}
	}
	for (const [index, file] of contract.filePolicy.entries()) {
		if (file.disposition === "projected" && !projectionPaths.has(file.path)) {
			addIssue(
				context,
				"AFG-CONTRACT-006",
				`${path}.filePolicy[${index}]`,
				"projected file disposition requires one projection definition",
			);
		}
	}
};

const validateContractPaths = (
	contract: GeneratorFamilyContractDefinition,
	path: string,
	context: ValidationContext,
): void => {
	for (const [
		index,
		workspaceRoot,
	] of contract.pathPolicy.workspaceRoots.entries()) {
		validateRelativeContractPath(
			workspaceRoot,
			`${path}.pathPolicy.workspaceRoots[${index}]`,
			context,
		);
	}
	validateRelativeContractPath(
		contract.entrypointPolicy.root,
		`${path}.entrypointPolicy.root`,
		context,
	);
	for (const [
		index,
		entrypoint,
	] of contract.entrypointPolicy.auxiliary.entries()) {
		validateRelativeContractPath(
			entrypoint,
			`${path}.entrypointPolicy.auxiliary[${index}]`,
			context,
		);
	}
};

const validateFamilyContract = (
	contract: GeneratorFamilyContractDefinition,
	path: string,
	context: ValidationContext,
): void => {
	checkDuplicate(
		contract.modes,
		(item) => item.id,
		`${path}.modes`,
		"mode id",
		context,
	);
	checkDuplicate(
		contract.capabilities,
		(item) => item.id,
		`${path}.capabilities`,
		"capability id",
		context,
	);
	checkDuplicate(
		contract.profiles,
		(item) => item.id,
		`${path}.profiles`,
		"profile id",
		context,
	);
	checkDuplicate(
		contract.filePolicy,
		(item) => item.path,
		`${path}.filePolicy`,
		"file owner",
		context,
		"AFG-CONTRACT-004",
	);
	checkDuplicate(
		contract.projections,
		(item) => item.id,
		`${path}.projections`,
		"projection id",
		context,
	);
	checkDuplicate(
		contract.projections,
		(item) => item.path,
		`${path}.projections`,
		"projection path",
		context,
	);
	checkDuplicate(
		contract.diagnostics,
		(item) => item.code,
		`${path}.diagnostics`,
		"diagnostic code",
		context,
	);
	checkDuplicateStrings(
		contract.semanticInput.canonicalOwners,
		`${path}.semanticInput.canonicalOwners`,
		"canonical owner",
		context,
		"AFG-CONTRACT-004",
	);
	checkDuplicateStrings(
		contract.pathPolicy.workspaceRoots,
		`${path}.pathPolicy.workspaceRoots`,
		"workspace root",
		context,
	);
	checkDuplicateStrings(
		contract.entrypointPolicy.auxiliary,
		`${path}.entrypointPolicy.auxiliary`,
		"auxiliary entrypoint",
		context,
	);
	checkDuplicateStrings(
		contract.taskPolicy.requiredScripts,
		`${path}.taskPolicy.requiredScripts`,
		"required script",
		context,
	);
	for (const [index, projection] of contract.projections.entries()) {
		checkDuplicateStrings(
			projection.canonicalInputs,
			`${path}.projections[${index}].canonicalInputs`,
			"canonical projection input",
			context,
		);
	}

	const capabilityIds = new Set(
		contract.capabilities.map((capability) => capability.id),
	);
	validateAuthorityActivation(contract, path, context);
	validateFileAndProjectionPolicy(contract, path, capabilityIds, context);
	for (const [index, diagnostic] of contract.diagnostics.entries()) {
		validateCapabilityReference(
			capabilityIds,
			diagnostic.capability,
			`${path}.diagnostics[${index}].capability`,
			context,
		);
	}
	validateContractPaths(contract, path, context);
	validateMigrationChain(contract, path, context);
};

const sortIssues = (
	issues: readonly ContractValidationIssue[],
): readonly ContractValidationIssue[] =>
	Object.freeze(
		[...issues].sort(
			(left, right) =>
				compareText(left.path, right.path) ||
				compareText(left.code, right.code) ||
				compareText(left.message, right.message),
		),
	);

export class GeneratorContractValidationError extends Error {
	readonly issues: readonly ContractValidationIssue[];

	constructor(issues: readonly ContractValidationIssue[]) {
		const sortedIssues = sortIssues(issues);
		super(
			`generator contract validation failed:\n${sortedIssues
				.map((issue) => `${issue.code} ${issue.path}: ${issue.message}`)
				.join("\n")}`,
		);
		this.name = "GeneratorContractValidationError";
		this.issues = sortedIssues;
	}
}

export const loadGeneratorContractRegistry = (
	input: unknown,
): GeneratorContractRegistry => {
	const context: ValidationContext = { issues: [] };
	const values = readArray(input, "contracts", context);
	if (values.length !== 2) {
		addIssue(
			context,
			"AFG-CONTRACT-009",
			"contracts",
			"exactly two family contracts are required",
		);
	}

	let kernel: GeneratorFamilyContractDefinition | undefined;
	let erp: GeneratorFamilyContractDefinition | undefined;
	for (const [index, value] of values.entries()) {
		const contractPath = `contracts[${index}]`;
		const contract = parseFamilyContract(value, contractPath, context);
		if (contract === undefined) {
			continue;
		}
		validateFamilyContract(contract, contractPath, context);
		if (contract.family === "kernel") {
			if (kernel === undefined) {
				kernel = contract;
			} else {
				addIssue(
					context,
					"AFG-CONTRACT-009",
					`${contractPath}.family`,
					"duplicate kernel family contract",
				);
			}
		} else if (erp === undefined) {
			erp = contract;
		} else {
			addIssue(
				context,
				"AFG-CONTRACT-009",
				`${contractPath}.family`,
				"duplicate ERP family contract",
			);
		}
	}

	if (kernel === undefined) {
		addIssue(
			context,
			"AFG-CONTRACT-009",
			"contracts",
			"kernel family contract is required",
		);
	}
	if (erp === undefined) {
		addIssue(
			context,
			"AFG-CONTRACT-009",
			"contracts",
			"ERP family contract is required",
		);
	}
	if (context.issues.length > 0 || kernel === undefined || erp === undefined) {
		throw new GeneratorContractValidationError(context.issues);
	}

	return Object.freeze({ kernel, erp });
};
