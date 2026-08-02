import type { GeneratorDiagnostic } from "./diagnostic-protocol.ts";
import type { DiagnosticTreatment, GeneratorFamily } from "./types.ts";

export const GENERATOR_RECONCILIATION_PLAN_SCHEMA =
	"afenda.generator-reconciliation-plan/v1" as const;

export type GeneratorPlanRisk = "high" | "low" | "medium";

export type GeneratorPlanStatus = "blocked" | "ready" | "unsupported";

export interface GeneratorReconciliationPlanOperation {
	readonly action: string;
	readonly automation: "automatic" | "manual";
	readonly currentState: string;
	readonly expectedState: string;
	readonly family: GeneratorFamily;
	readonly package: string;
	readonly paths: readonly string[];
	readonly reason: string;
	readonly risk: GeneratorPlanRisk;
	readonly status: GeneratorPlanStatus;
	readonly treatment: GeneratorDiagnostic["treatment"];
	readonly writes: false;
}

export interface GeneratorReconciliationPlanSummary {
	readonly automatic: number;
	readonly blocked: number;
	readonly highRisk: number;
	readonly lowRisk: number;
	readonly manual: number;
	readonly mediumRisk: number;
	readonly ready: number;
	readonly total: number;
	readonly unsupported: number;
}

export interface GeneratorReconciliationPlanV1 {
	readonly family: GeneratorFamily;
	readonly operations: readonly GeneratorReconciliationPlanOperation[];
	readonly schema: typeof GENERATOR_RECONCILIATION_PLAN_SCHEMA;
	readonly summary: GeneratorReconciliationPlanSummary;
}

export class GeneratorReconciliationPlanError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GeneratorReconciliationPlanError";
	}
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const stableJson = (value: unknown): string => JSON.stringify(value);

const describeCurrentState = (diagnostic: GeneratorDiagnostic): string =>
	stableJson(diagnostic.actual);

const describeExpectedState = (diagnostic: GeneratorDiagnostic): string =>
	stableJson(diagnostic.expected);

const ACTION_BY_TREATMENT = Object.freeze({
	"auto-reconcile": "reconcile-projection",
	"auto-regenerate": "regenerate-authority-owned-artifact",
	"auto-upgrade": "upgrade-to-canonical-shape",
	collision: "resolve-collision-before-automation",
	"remove-superseded": "remove-retired-local-authority",
	"semantic-decision-required": "record-semantic-decision",
	unsupported: "add-treatment-policy",
} as const satisfies Record<DiagnosticTreatment, string>);

const actionForDiagnostic = (diagnostic: GeneratorDiagnostic): string => {
	const treatment = diagnostic.treatment as DiagnosticTreatment;
	return ACTION_BY_TREATMENT[treatment];
};

const statusForDiagnostic = (
	diagnostic: GeneratorDiagnostic,
): GeneratorPlanStatus => {
	if (diagnostic.treatment === "unsupported") {
		return "unsupported";
	}
	if (
		diagnostic.severity === "blocked" ||
		diagnostic.treatment === "collision" ||
		diagnostic.treatment === "semantic-decision-required"
	) {
		return "blocked";
	}
	return "ready";
};

const automationForDiagnostic = (
	diagnostic: GeneratorDiagnostic,
): "automatic" | "manual" =>
	statusForDiagnostic(diagnostic) === "ready" &&
	diagnostic.treatment !== "unsupported"
		? "automatic"
		: "manual";

const riskForDiagnostic = (
	diagnostic: GeneratorDiagnostic,
): GeneratorPlanRisk => {
	if (
		diagnostic.severity === "blocked" ||
		diagnostic.treatment === "collision" ||
		diagnostic.treatment === "semantic-decision-required"
	) {
		return "high";
	}
	if (
		diagnostic.treatment === "auto-reconcile" ||
		diagnostic.treatment === "auto-regenerate"
	) {
		return "low";
	}
	return "medium";
};

const createOperation = (
	diagnostic: GeneratorDiagnostic,
): GeneratorReconciliationPlanOperation =>
	Object.freeze({
		family: diagnostic.family,
		package: diagnostic.package,
		treatment: diagnostic.treatment,
		status: statusForDiagnostic(diagnostic),
		automation: automationForDiagnostic(diagnostic),
		action: actionForDiagnostic(diagnostic),
		risk: riskForDiagnostic(diagnostic),
		reason: `${diagnostic.owner} emitted ${diagnostic.code}`,
		paths: Object.freeze([...diagnostic.paths].sort(compareText)),
		currentState: describeCurrentState(diagnostic),
		expectedState: describeExpectedState(diagnostic),
		writes: false,
	});

const compareOperations = (
	left: GeneratorReconciliationPlanOperation,
	right: GeneratorReconciliationPlanOperation,
): number =>
	compareText(left.family, right.family) ||
	compareText(left.package, right.package) ||
	compareText(left.action, right.action) ||
	compareText(left.paths.join("\u0000"), right.paths.join("\u0000"));

const createSummary = (
	operations: readonly GeneratorReconciliationPlanOperation[],
): GeneratorReconciliationPlanSummary =>
	Object.freeze({
		total: operations.length,
		ready: operations.filter((operation) => operation.status === "ready")
			.length,
		blocked: operations.filter((operation) => operation.status === "blocked")
			.length,
		unsupported: operations.filter(
			(operation) => operation.status === "unsupported",
		).length,
		automatic: operations.filter(
			(operation) => operation.automation === "automatic",
		).length,
		manual: operations.filter((operation) => operation.automation === "manual")
			.length,
		lowRisk: operations.filter((operation) => operation.risk === "low").length,
		mediumRisk: operations.filter((operation) => operation.risk === "medium")
			.length,
		highRisk: operations.filter((operation) => operation.risk === "high")
			.length,
	});

export const createGeneratorReconciliationPlan = ({
	diagnostics,
	family,
}: {
	readonly diagnostics: readonly GeneratorDiagnostic[];
	readonly family: GeneratorFamily;
}): GeneratorReconciliationPlanV1 => {
	const operations = Object.freeze(
		diagnostics.map(createOperation).sort(compareOperations),
	);
	return Object.freeze({
		schema: GENERATOR_RECONCILIATION_PLAN_SCHEMA,
		family,
		summary: createSummary(operations),
		operations,
	});
};

export const renderGeneratorReconciliationPlanText = (
	plan: GeneratorReconciliationPlanV1,
): string =>
	[
		`${plan.family}-generator upgrade plan`,
		`schema=${plan.schema}`,
		"writes=false",
		`operation-count=${plan.summary.total}`,
		`ready=${plan.summary.ready}`,
		`blocked=${plan.summary.blocked}`,
		`unsupported=${plan.summary.unsupported}`,
		`automatic=${plan.summary.automatic}`,
		`manual=${plan.summary.manual}`,
		`risk-low=${plan.summary.lowRisk}`,
		`risk-medium=${plan.summary.mediumRisk}`,
		`risk-high=${plan.summary.highRisk}`,
		...plan.operations.map(
			(operation) =>
				`operation=${operation.package}|${operation.status}|${operation.automation}|${operation.action}|${operation.risk}|${operation.paths.join(",")}`,
		),
	]
		.join("\n")
		.concat("\n");

const isGeneratorPlanRisk = (value: unknown): value is GeneratorPlanRisk =>
	value === "high" || value === "low" || value === "medium";

const isGeneratorPlanStatus = (value: unknown): value is GeneratorPlanStatus =>
	value === "blocked" || value === "ready" || value === "unsupported";

const isDiagnosticTreatment = (value: unknown): value is DiagnosticTreatment =>
	Object.hasOwn(ACTION_BY_TREATMENT, String(value));

const parseOperation = (
	input: unknown,
): GeneratorReconciliationPlanOperation => {
	if (
		!isRecord(input) ||
		(input.family !== "erp" && input.family !== "kernel") ||
		typeof input.package !== "string" ||
		!isDiagnosticTreatment(input.treatment) ||
		!isGeneratorPlanStatus(input.status) ||
		(input.automation !== "automatic" && input.automation !== "manual") ||
		typeof input.action !== "string" ||
		!isGeneratorPlanRisk(input.risk) ||
		typeof input.reason !== "string" ||
		!Array.isArray(input.paths) ||
		!input.paths.every((path) => typeof path === "string") ||
		typeof input.currentState !== "string" ||
		typeof input.expectedState !== "string" ||
		input.writes !== false
	) {
		throw new GeneratorReconciliationPlanError(
			"generator reconciliation plan operation is invalid",
		);
	}
	return Object.freeze({
		family: input.family,
		package: input.package,
		treatment: input.treatment,
		status: input.status,
		automation: input.automation,
		action: input.action,
		risk: input.risk,
		reason: input.reason,
		paths: Object.freeze([...input.paths].sort(compareText)),
		currentState: input.currentState,
		expectedState: input.expectedState,
		writes: false,
	});
};

export const parseGeneratorReconciliationPlan = (
	input: unknown,
): GeneratorReconciliationPlanV1 => {
	if (
		!isRecord(input) ||
		input.schema !== GENERATOR_RECONCILIATION_PLAN_SCHEMA ||
		(input.family !== "erp" && input.family !== "kernel") ||
		!isRecord(input.summary) ||
		!Array.isArray(input.operations)
	) {
		throw new GeneratorReconciliationPlanError(
			"generator reconciliation plan is invalid",
		);
	}
	const operations = Object.freeze(
		input.operations.map(parseOperation).sort(compareOperations),
	);
	return Object.freeze({
		schema: GENERATOR_RECONCILIATION_PLAN_SCHEMA,
		family: input.family,
		summary: createSummary(operations),
		operations,
	});
};
