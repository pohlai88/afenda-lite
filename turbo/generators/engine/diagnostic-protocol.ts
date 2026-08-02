import { z } from "zod";

import {
	DIAGNOSTIC_SEVERITIES,
	DIAGNOSTIC_TREATMENTS,
	GENERATOR_FAMILIES,
} from "./types.ts";
import { normalizeWorkspacePath } from "./workspace-discovery.ts";

export const GENERATOR_DIAGNOSTIC_REPORT_SCHEMA =
	"afenda.generator-diagnostics/v1" as const;

export const GENERATOR_DIAGNOSTIC_REPORT_SCHEMA_ID =
	"https://www.nexuscanon.com/schemas/afenda.generator-diagnostics.v1.json";

export const GENERATOR_DIAGNOSTIC_ORDER = Object.freeze([
	"family",
	"package",
	"code",
	"first-normalized-path",
	"severity",
	"treatment",
	"owner",
	"all-normalized-paths",
	"expected-json",
	"actual-json",
] as const);

const DIAGNOSTIC_CODE = /^AFG-[A-Z]+-[0-9]{3}$/;
const WINDOWS_DRIVE_PATH = /^[A-Za-z]:/;
const ASCII_CONTROL_MAX = 31;
const ASCII_DELETE = 127;
const MAX_PACKAGE_LENGTH = 214;
const MAX_OWNER_LENGTH = 256;
const MAX_PATH_LENGTH = 1024;
const MAX_PATHS_PER_DIAGNOSTIC = 32;
const MAX_DIAGNOSTIC_VALUE_BYTES = 4096;

const boundedNonBlankString = (maximumLength: number) =>
	z
		.string()
		.min(1)
		.max(maximumLength)
		.refine((value) => value.trim() === value, {
			message: "must not contain surrounding whitespace",
		})
		.refine((value) => !containsControlCharacter(value), {
			message: "must not contain control characters",
		});

const jsonValueSchema = z.json();

const canonicalJsonValueSchema = z
	.unknown()
	.transform((value) => canonicalizeJson(value));

const generatorDiagnosticIdentityShape = {
	code: z.string().regex(DIAGNOSTIC_CODE),
	severity: z.enum(DIAGNOSTIC_SEVERITIES),
	family: z.enum(GENERATOR_FAMILIES),
	package: boundedNonBlankString(MAX_PACKAGE_LENGTH),
	owner: boundedNonBlankString(MAX_OWNER_LENGTH),
	treatment: z.enum(DIAGNOSTIC_TREATMENTS),
	paths: z
		.array(boundedNonBlankString(MAX_PATH_LENGTH))
		.min(1)
		.max(MAX_PATHS_PER_DIAGNOSTIC)
		.readonly(),
} as const;

const generatorDiagnosticInputSchemaV1 = z
	.strictObject({
		...generatorDiagnosticIdentityShape,
		actual: z.unknown(),
		expected: z.unknown(),
	})
	.readonly();

const generatorDiagnosticSchemaV1 = z
	.strictObject({
		...generatorDiagnosticIdentityShape,
		actual: canonicalJsonValueSchema,
		expected: canonicalJsonValueSchema,
	})
	.readonly();

const GENERATOR_RUN_OUTCOMES = [
	"completed",
	"invalid-contract",
	"execution-failure",
] as const;

const generatorRunOutcomeSchema = z.enum(GENERATOR_RUN_OUTCOMES);

const generatorRunOutcomesSchema = z
	.array(generatorRunOutcomeSchema)
	.min(1)
	.max(GENERATOR_RUN_OUTCOMES.length)
	.readonly();

const generatorExitCodeSchema = z.union([
	z.literal(0),
	z.literal(10),
	z.literal(20),
	z.literal(30),
	z.literal(40),
]);

const generatorDiagnosticSummarySchemaV1 = z
	.strictObject({
		total: z.number().int().nonnegative(),
		info: z.number().int().nonnegative(),
		warning: z.number().int().nonnegative(),
		error: z.number().int().nonnegative(),
		blocked: z.number().int().nonnegative(),
	})
	.readonly();

const generatorDiagnosticReportSchemaV1 = z
	.strictObject({
		schema: z.literal(GENERATOR_DIAGNOSTIC_REPORT_SCHEMA),
		outcomes: generatorRunOutcomesSchema,
		diagnostics: z.array(generatorDiagnosticSchemaV1).readonly(),
		summary: generatorDiagnosticSummarySchemaV1,
		exitCode: generatorExitCodeSchema,
	})
	.readonly();

export type GeneratorJsonValue = z.infer<typeof jsonValueSchema>;
export type GeneratorDiagnostic = z.infer<typeof generatorDiagnosticSchemaV1>;
export type GeneratorRunOutcome = z.infer<typeof generatorRunOutcomeSchema>;
export type GeneratorExitCode = z.infer<typeof generatorExitCodeSchema>;
export type GeneratorDiagnosticReportV1 = z.infer<
	typeof generatorDiagnosticReportSchemaV1
>;

export interface CreateGeneratorDiagnosticReportInput {
	readonly diagnostics: readonly unknown[];
	readonly outcomes?: readonly GeneratorRunOutcome[];
}

interface ResolveGeneratorExitCodeInput {
	readonly diagnostics: readonly Pick<GeneratorDiagnostic, "severity">[];
	readonly outcomes: readonly GeneratorRunOutcome[];
}

type GeneratorJsonObject = Record<string, GeneratorJsonValue>;

const isJsonObject = (value: unknown): value is GeneratorJsonObject =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isPlainUnknownObject = (
	value: unknown,
): value is Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
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

function containsControlCharacter(value: string): boolean {
	for (const character of value) {
		const characterCode = character.charCodeAt(0);
		if (characterCode <= ASCII_CONTROL_MAX || characterCode === ASCII_DELETE) {
			return true;
		}
	}
	return false;
}

const freezeRecursively = (value: unknown): void => {
	if (typeof value !== "object" || value === null) {
		return;
	}
	const children = Array.isArray(value) ? value : Object.values(value);
	for (const child of children) {
		freezeRecursively(child);
	}
	if (!Object.isFrozen(value)) {
		Object.freeze(value);
	}
};

const canonicalizeJson = (value: unknown): GeneratorJsonValue => {
	if (value === null || typeof value === "boolean") {
		return value;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new GeneratorDiagnosticProtocolError(
				"diagnostic JSON numbers must be finite",
			);
		}
		return value;
	}
	if (typeof value === "string") {
		return value.normalize("NFC");
	}
	if (Array.isArray(value)) {
		return value.map((item) => {
			if (item === undefined) {
				throw new GeneratorDiagnosticProtocolError(
					"diagnostic JSON arrays cannot contain undefined values",
				);
			}
			return canonicalizeJson(item);
		});
	}
	if (isPlainUnknownObject(value)) {
		const result: GeneratorJsonObject = {};
		const entries = Object.keys(value)
			.map((key) => ({
				key,
				normalizedKey: key.normalize("NFC"),
				value: value[key],
			}))
			.filter((entry) => entry.value !== undefined)
			.sort((left, right) =>
				compareText(left.normalizedKey, right.normalizedKey),
			);
		for (const entry of entries) {
			const { normalizedKey } = entry;
			if (Object.hasOwn(result, normalizedKey)) {
				throw new GeneratorDiagnosticProtocolError(
					"diagnostic JSON object keys must be unique after Unicode normalization",
				);
			}
			Object.defineProperty(result, normalizedKey, {
				configurable: true,
				enumerable: true,
				value: canonicalizeJson(entry.value),
				writable: true,
			});
		}
		return result;
	}
	throw new GeneratorDiagnosticProtocolError(
		"diagnostic value must contain JSON-compatible data",
	);
};

const serializeJson = (value: unknown, indent?: number): string => {
	const serialized = JSON.stringify(value, null, indent);
	if (serialized === undefined) {
		throw new GeneratorDiagnosticProtocolError(
			"diagnostic JSON value cannot be serialized",
		);
	}
	return serialized;
};

const assertBoundedJsonValue = (
	value: GeneratorJsonValue,
	field: "actual" | "expected",
): void => {
	const { byteLength } = new TextEncoder().encode(serializeJson(value));
	if (byteLength > MAX_DIAGNOSTIC_VALUE_BYTES) {
		throw new GeneratorDiagnosticProtocolError(
			`diagnostic ${field} exceeds ${MAX_DIAGNOSTIC_VALUE_BYTES} bytes`,
		);
	}
};

const normalizeDiagnosticPath = (value: string): string => {
	const normalized = normalizeWorkspacePath(value);
	const segments = normalized.split("/");
	if (
		normalized.length === 0 ||
		normalized.length > MAX_PATH_LENGTH ||
		normalized.startsWith("/") ||
		WINDOWS_DRIVE_PATH.test(normalized) ||
		containsControlCharacter(normalized) ||
		(normalized !== "." &&
			segments.some(
				(segment) => segment === "" || segment === "." || segment === "..",
			))
	) {
		throw new GeneratorDiagnosticProtocolError(
			"diagnostic path must be repository-relative and normalized",
		);
	}
	return normalized;
};

const normalizeDiagnosticPaths = (
	paths: readonly string[],
): readonly string[] => {
	const normalizedPaths = paths.map(normalizeDiagnosticPath).sort(compareText);
	for (let index = 1; index < normalizedPaths.length; index += 1) {
		if (normalizedPaths[index] === normalizedPaths[index - 1]) {
			throw new GeneratorDiagnosticProtocolError(
				"diagnostic paths must be unique after normalization",
			);
		}
	}
	return Object.freeze(normalizedPaths);
};

const diagnosticFirstPathSortKey = (diagnostic: GeneratorDiagnostic): string =>
	diagnostic.paths[0] ?? "";

const diagnosticAllPathsSortKey = (diagnostic: GeneratorDiagnostic): string =>
	diagnostic.paths.join("\u0000");

const compareDiagnostics = (
	left: GeneratorDiagnostic,
	right: GeneratorDiagnostic,
): number =>
	compareText(left.family, right.family) ||
	compareText(left.package, right.package) ||
	compareText(left.code, right.code) ||
	compareText(
		diagnosticFirstPathSortKey(left),
		diagnosticFirstPathSortKey(right),
	) ||
	compareText(left.severity, right.severity) ||
	compareText(left.treatment, right.treatment) ||
	compareText(left.owner, right.owner) ||
	compareText(
		diagnosticAllPathsSortKey(left),
		diagnosticAllPathsSortKey(right),
	) ||
	compareText(serializeJson(left.expected), serializeJson(right.expected)) ||
	compareText(serializeJson(left.actual), serializeJson(right.actual));

const parseDiagnosticInput = (
	input: unknown,
): z.infer<typeof generatorDiagnosticInputSchemaV1> => {
	try {
		return generatorDiagnosticInputSchemaV1.parse(input);
	} catch (cause: unknown) {
		throw new GeneratorDiagnosticProtocolError(
			"generator diagnostic input is invalid",
			{ cause },
		);
	}
};

const parseDiagnosticReport = (input: unknown): GeneratorDiagnosticReportV1 => {
	try {
		return generatorDiagnosticReportSchemaV1.parse(input);
	} catch (cause: unknown) {
		throw new GeneratorDiagnosticProtocolError(
			"generator diagnostic report is invalid",
			{ cause },
		);
	}
};

const createSummary = (
	diagnostics: readonly GeneratorDiagnostic[],
): GeneratorDiagnosticReportV1["summary"] => {
	const counts = {
		info: 0,
		warning: 0,
		error: 0,
		blocked: 0,
	};
	for (const diagnostic of diagnostics) {
		counts[diagnostic.severity] += 1;
	}
	return Object.freeze({ total: diagnostics.length, ...counts });
};

const compareRunOutcomes = (
	left: GeneratorRunOutcome,
	right: GeneratorRunOutcome,
): number =>
	GENERATOR_RUN_OUTCOMES.indexOf(left) - GENERATOR_RUN_OUTCOMES.indexOf(right);

const normalizeRunOutcomes = (
	inputs: readonly GeneratorRunOutcome[],
): readonly GeneratorRunOutcome[] => {
	let parsed: readonly GeneratorRunOutcome[];
	try {
		parsed = generatorRunOutcomesSchema.parse(inputs);
	} catch (cause: unknown) {
		throw new GeneratorDiagnosticProtocolError(
			"generator run outcomes are invalid",
			{ cause },
		);
	}
	const outcomes = [...new Set(parsed)].sort(compareRunOutcomes);
	if (outcomes.includes("completed") && outcomes.length > 1) {
		throw new GeneratorDiagnosticProtocolError(
			"completed cannot be combined with failure outcomes",
		);
	}
	return Object.freeze(outcomes);
};

export class GeneratorDiagnosticProtocolError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "GeneratorDiagnosticProtocolError";
	}
}

export const createGeneratorDiagnostic = (
	input: unknown,
): GeneratorDiagnostic => {
	const parsed = parseDiagnosticInput(input);
	const diagnostic = generatorDiagnosticSchemaV1.parse({
		...parsed,
		package: parsed.package.normalize("NFC"),
		owner: parsed.owner.normalize("NFC"),
		paths: normalizeDiagnosticPaths(parsed.paths),
	});
	assertBoundedJsonValue(diagnostic.actual, "actual");
	assertBoundedJsonValue(diagnostic.expected, "expected");
	freezeRecursively(diagnostic);
	return diagnostic;
};

export const resolveGeneratorExitCode = ({
	diagnostics,
	outcomes,
}: ResolveGeneratorExitCodeInput): GeneratorExitCode => {
	if (outcomes.includes("execution-failure")) {
		return 40;
	}
	if (outcomes.includes("invalid-contract")) {
		return 30;
	}
	if (diagnostics.some((diagnostic) => diagnostic.severity === "blocked")) {
		return 20;
	}
	if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
		return 10;
	}
	return 0;
};

export const createGeneratorDiagnosticReport = ({
	diagnostics: inputs,
	outcomes: inputOutcomes = ["completed"],
}: CreateGeneratorDiagnosticReportInput): GeneratorDiagnosticReportV1 => {
	const outcomes = normalizeRunOutcomes(inputOutcomes);
	const diagnostics = inputs
		.map(createGeneratorDiagnostic)
		.sort(compareDiagnostics);
	const report = generatorDiagnosticReportSchemaV1.parse({
		schema: GENERATOR_DIAGNOSTIC_REPORT_SCHEMA,
		outcomes,
		diagnostics,
		summary: createSummary(diagnostics),
		exitCode: resolveGeneratorExitCode({ diagnostics, outcomes }),
	});
	freezeRecursively(report);
	return report;
};

const assertCanonicalReport = (input: unknown): GeneratorDiagnosticReportV1 => {
	const parsed = parseDiagnosticReport(input);
	const canonical = createGeneratorDiagnosticReport({
		diagnostics: parsed.diagnostics,
		outcomes: parsed.outcomes,
	});
	if (serializeJson(parsed) !== serializeJson(canonical)) {
		throw new GeneratorDiagnosticProtocolError(
			"generator diagnostic report is not canonical",
		);
	}
	return canonical;
};

export const parseGeneratorDiagnosticReport = (
	input: unknown,
): GeneratorDiagnosticReportV1 => assertCanonicalReport(input);

export const renderGeneratorDiagnosticReportJson = (input: unknown): string =>
	`${serializeJson(parseGeneratorDiagnosticReport(input), 2)}\n`;

export const renderGeneratorDiagnosticReportText = (input: unknown): string => {
	const report = parseGeneratorDiagnosticReport(input);
	const lines = [
		`schema=${report.schema}`,
		`outcomes=${report.outcomes.join(",")}`,
		`exit=${report.exitCode}`,
		`summary total=${report.summary.total} info=${report.summary.info} warning=${report.summary.warning} error=${report.summary.error} blocked=${report.summary.blocked}`,
	];
	for (const diagnostic of report.diagnostics) {
		lines.push(
			`${diagnostic.family} ${diagnostic.package} ${diagnostic.code} ${diagnostic.severity} path=${diagnostic.paths.join(",")}`,
			`  owner=${diagnostic.owner}`,
			`  treatment=${diagnostic.treatment}`,
			`  expected=${serializeJson(diagnostic.expected)}`,
			`  actual=${serializeJson(diagnostic.actual)}`,
		);
	}
	return `${lines.join("\n")}\n`;
};

const createJsonSchema = (): GeneratorJsonValue => {
	const serialized = JSON.stringify(
		z.toJSONSchema(generatorDiagnosticReportSchemaV1, {
			io: "input",
			target: "draft-2020-12",
			unrepresentable: "throw",
		}),
	);
	const parsedInput: unknown = JSON.parse(serialized);
	const parsed = jsonValueSchema.parse(parsedInput);
	if (!isJsonObject(parsed)) {
		throw new GeneratorDiagnosticProtocolError(
			"generated diagnostic report JSON schema must be an object",
		);
	}
	const schema = canonicalizeJson({
		...parsed,
		$id: GENERATOR_DIAGNOSTIC_REPORT_SCHEMA_ID,
	});
	freezeRecursively(schema);
	return schema;
};

export const generatorDiagnosticReportJsonSchemaV1 = createJsonSchema();
