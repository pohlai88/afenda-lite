import type { GeneratorDiagnostic } from "../engine/diagnostic-protocol.ts";
import type { DiagnosticTreatment } from "../engine/types.ts";

export const ERP_TREATMENT_AUTHORITY_SCHEMA =
	"afenda.erp-treatment-authority/v1" as const;

export const ERP_TREATMENT_AUTHORITY_VERSION = 1 as const;

export type ErpTreatmentActionKind =
	| "reconcile-projection-lock"
	| "remove-superseded-file"
	| "repair-feature-imports"
	| "request-semantic-decision"
	| "resolve-collision"
	| "upgrade-feature-first-layout";

export type ErpTreatmentAutomation = "automatic" | "manual";

export type ErpTreatmentStatus = "blocked" | "ready" | "unsupported";

export interface ErpTreatmentPolicy {
	readonly actionKind: ErpTreatmentActionKind;
	readonly automation: ErpTreatmentAutomation;
	readonly capability: string;
	readonly code: string;
	readonly recovery: string;
	readonly status: ErpTreatmentStatus;
	readonly treatment: DiagnosticTreatment;
	readonly version: typeof ERP_TREATMENT_AUTHORITY_VERSION;
}

export interface ErpTreatmentStep {
	readonly actionKind: ErpTreatmentActionKind;
	readonly actual: GeneratorDiagnostic["actual"];
	readonly automation: ErpTreatmentAutomation;
	readonly code: string;
	readonly expected: GeneratorDiagnostic["expected"];
	readonly owner: string;
	readonly package: string;
	readonly paths: readonly string[];
	readonly recovery: string;
	readonly status: ErpTreatmentStatus;
	readonly treatment: DiagnosticTreatment;
	readonly version: typeof ERP_TREATMENT_AUTHORITY_VERSION;
}

export interface ErpTreatmentSummary {
	readonly automatic: number;
	readonly blocked: number;
	readonly manual: number;
	readonly ready: number;
	readonly total: number;
	readonly unsupported: number;
}

export interface ErpTreatmentPlanV1 {
	readonly fromVersion: number;
	readonly schema: typeof ERP_TREATMENT_AUTHORITY_SCHEMA;
	readonly steps: readonly ErpTreatmentStep[];
	readonly summary: ErpTreatmentSummary;
	readonly toVersion: typeof ERP_TREATMENT_AUTHORITY_VERSION;
}

export interface CreateErpTreatmentPlanInput {
	readonly diagnostics: readonly GeneratorDiagnostic[];
	readonly fromVersion?: number;
}

const ERP_TREATMENT_POLICIES = Object.freeze([
	{
		code: "AFG-ERP-001",
		treatment: "semantic-decision-required",
		capability: "manifest-projection",
		actionKind: "request-semantic-decision",
		automation: "manual",
		status: "blocked",
		recovery:
			"Author the missing module semantic owner before projection can proceed.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	},
	{
		code: "AFG-ERP-002",
		treatment: "collision",
		capability: "manifest-projection",
		actionKind: "resolve-collision",
		automation: "manual",
		status: "blocked",
		recovery:
			"Choose one manifest authority, preserve canonical semantics, and delete the competing source.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	},
	{
		code: "AFG-ERP-101",
		treatment: "collision",
		capability: "feature-first-layout",
		actionKind: "resolve-collision",
		automation: "manual",
		status: "blocked",
		recovery:
			"Rename or relocate the package root so the module id and workspace path agree.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	},
	{
		code: "AFG-ERP-102",
		treatment: "auto-upgrade",
		capability: "feature-first-layout",
		actionKind: "upgrade-feature-first-layout",
		automation: "automatic",
		status: "ready",
		recovery:
			"Plan a feature-first layout upgrade from the package semantic inputs.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	},
	{
		code: "AFG-ERP-103",
		treatment: "remove-superseded",
		capability: "feature-first-layout",
		actionKind: "remove-superseded-file",
		automation: "automatic",
		status: "ready",
		recovery:
			"Remove local layout scripts after generator-owned layout treatment is available.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	},
	{
		code: "AFG-ERP-104",
		treatment: "auto-upgrade",
		capability: "feature-first-layout",
		actionKind: "repair-feature-imports",
		automation: "automatic",
		status: "ready",
		recovery:
			"Rewrite feature-local imports to consume feature-owned or composition-owned capabilities.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	},
	{
		code: "AFG-ERP-105",
		treatment: "auto-upgrade",
		capability: "feature-first-layout",
		actionKind: "upgrade-feature-first-layout",
		automation: "automatic",
		status: "ready",
		recovery:
			"Add the owning features to the group or remove the empty group.definition.ts classification surface.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	},
	{
		code: "AFG-ERP-201",
		treatment: "auto-reconcile",
		capability: "projection-lock",
		actionKind: "reconcile-projection-lock",
		automation: "automatic",
		status: "ready",
		recovery:
			"Write or refresh the projection lock from the canonical projection digest.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	},
] as const satisfies readonly ErpTreatmentPolicy[]);

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const findPolicy = (diagnostic: GeneratorDiagnostic): ErpTreatmentPolicy => {
	const policy = ERP_TREATMENT_POLICIES.find(
		(candidate) =>
			candidate.code === diagnostic.code &&
			candidate.treatment === diagnostic.treatment,
	);
	if (policy !== undefined) {
		return policy;
	}
	return Object.freeze({
		code: diagnostic.code,
		treatment: diagnostic.treatment,
		capability: "unsupported",
		actionKind: "request-semantic-decision",
		automation: "manual",
		status: "unsupported",
		recovery:
			"Add a versioned treatment policy before this diagnostic can be recovered by the generator.",
		version: ERP_TREATMENT_AUTHORITY_VERSION,
	});
};

const createStep = (diagnostic: GeneratorDiagnostic): ErpTreatmentStep => {
	const policy = findPolicy(diagnostic);
	return Object.freeze({
		code: diagnostic.code,
		treatment: diagnostic.treatment,
		version: policy.version,
		package: diagnostic.package,
		owner: diagnostic.owner,
		paths: diagnostic.paths,
		actionKind: policy.actionKind,
		automation: policy.automation,
		status: policy.status,
		recovery: policy.recovery,
		expected: diagnostic.expected,
		actual: diagnostic.actual,
	});
};

const createSummary = (
	steps: readonly ErpTreatmentStep[],
): ErpTreatmentSummary =>
	Object.freeze({
		total: steps.length,
		automatic: steps.filter((step) => step.automation === "automatic").length,
		manual: steps.filter((step) => step.automation === "manual").length,
		ready: steps.filter((step) => step.status === "ready").length,
		blocked: steps.filter((step) => step.status === "blocked").length,
		unsupported: steps.filter((step) => step.status === "unsupported").length,
	});

const compareSteps = (
	left: ErpTreatmentStep,
	right: ErpTreatmentStep,
): number =>
	compareText(left.package, right.package) ||
	compareText(left.code, right.code) ||
	compareText(left.paths.join("\u0000"), right.paths.join("\u0000")) ||
	compareText(left.actionKind, right.actionKind);

export const createErpTreatmentPlan = ({
	diagnostics,
	fromVersion = 0,
}: CreateErpTreatmentPlanInput): ErpTreatmentPlanV1 => {
	const steps = Object.freeze(diagnostics.map(createStep).sort(compareSteps));
	return Object.freeze({
		schema: ERP_TREATMENT_AUTHORITY_SCHEMA,
		fromVersion,
		toVersion: ERP_TREATMENT_AUTHORITY_VERSION,
		summary: createSummary(steps),
		steps,
	});
};

export const renderErpTreatmentPlanTextLines = (
	plan: ErpTreatmentPlanV1,
): readonly string[] =>
	Object.freeze([
		`erp-treatment-schema=${plan.schema}`,
		`erp-treatment-version=${plan.toVersion}`,
		`erp-treatment-from-version=${plan.fromVersion}`,
		`erp-treatment-count=${plan.summary.total}`,
		`erp-treatment-ready=${plan.summary.ready}`,
		`erp-treatment-blocked=${plan.summary.blocked}`,
		`erp-treatment-unsupported=${plan.summary.unsupported}`,
		`erp-treatment-automatic=${plan.summary.automatic}`,
		`erp-treatment-manual=${plan.summary.manual}`,
		...plan.steps.map(
			(step) =>
				`erp-treatment=${step.package}|${step.code}|${step.status}|${step.automation}|${step.actionKind}|${step.paths.join(",")}`,
		),
	]);
