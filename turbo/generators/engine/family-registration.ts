import type { PlopTypes } from "@turbo/gen";

import {
	createGeneratorDiagnosticReport,
	type GeneratorDiagnostic,
	type GeneratorDiagnosticReportV1,
	renderGeneratorDiagnosticReportText,
} from "./diagnostic-protocol.ts";
import {
	createGeneratorReconciliationPlan,
	type GeneratorReconciliationPlanV1,
	renderGeneratorReconciliationPlanText,
} from "./reconciliation-planner.ts";
import type {
	GeneratorContractRegistry,
	GeneratorFamily,
	GeneratorFamilyContractDefinition,
	GeneratorName,
} from "./types.ts";
import {
	type DiscoveredWorkspace,
	discoverWorkspaces,
	type WorkspaceFamilyClassification,
} from "./workspace-discovery.ts";

export const GENERATOR_DOCTOR_OUTPUT_FORMATS = Object.freeze([
	"text",
	"json",
] as const);

export type GeneratorDoctorOutputFormat =
	(typeof GENERATOR_DOCTOR_OUTPUT_FORMATS)[number];

export interface GeneratorDoctorOptions {
	readonly format?: unknown;
}

export interface GeneratorPlanOptions {
	readonly format?: unknown;
}

export interface GeneratorFamilyRegistration {
	readonly contract: GeneratorFamilyContractDefinition;
	readonly doctor: (
		repositoryRoot: string,
		options?: GeneratorDoctorOptions,
	) => Promise<string>;
	readonly name: GeneratorName;
	readonly planJsonName: `${GeneratorName}-plan-upgrade-json`;
	readonly planName: `${GeneratorName}-plan-upgrade`;
	readonly planUpgrade: (
		repositoryRoot: string,
		options?: GeneratorPlanOptions,
	) => Promise<string>;
	readonly register: (plop: GeneratorRegistrar) => void;
}

export interface GeneratorDoctorExtension {
	readonly diagnostics: readonly GeneratorDiagnostic[];
	readonly json: unknown;
	readonly kind: string;
	readonly textLines: readonly string[];
}

export interface GeneratorRegistrar {
	readonly setGenerator: (
		name: string,
		config: Partial<PlopTypes.PlopGeneratorConfig>,
	) => void;
}

interface WorkspaceCountSummary {
	readonly erpCandidates: number;
	readonly kernelCandidates: number;
	readonly outsideFamilyScope: number;
	readonly total: number;
}

interface GeneratorDoctorWorkspace {
	readonly classification: string;
	readonly name: string;
	readonly path: string;
}

interface GeneratorDoctorReportV1 {
	readonly activeModes: readonly string[];
	readonly authoritativeCapabilities: number;
	readonly diagnostics: GeneratorDiagnosticReportV1;
	readonly discovery: Readonly<
		WorkspaceCountSummary & {
			readonly reconciliation: string;
			readonly workspaces: readonly GeneratorDoctorWorkspace[];
		}
	>;
	readonly extension: unknown;
	readonly family: GeneratorFamily;
	readonly release: GeneratorFamilyContractDefinition["release"]["state"];
	readonly schema: "afenda.generator-doctor/v1";
	readonly scope: "workspace-discovery-and-contract-diagnostics";
}

type GeneratorPlanOutputFormat = "json" | "text";

interface CreateFamilyRegistrationOptions {
	readonly createDoctorExtension?: (input: {
		readonly repositoryRoot: string;
		readonly workspaces: readonly DiscoveredWorkspace[];
	}) => Promise<GeneratorDoctorExtension>;
}

export class GeneratorDoctorOutputFormatError extends Error {
	readonly exitCode = 40 as const;

	constructor(format: unknown) {
		super(`unsupported generator doctor output format: ${String(format)}`);
		this.name = "GeneratorDoctorOutputFormatError";
	}
}

const describeActiveModes = (
	contract: GeneratorFamilyContractDefinition,
): string => contract.modes.map((mode) => mode.id).join(", ");

const createDoctorReport = (
	contract: GeneratorFamilyContractDefinition,
	workspaces: readonly DiscoveredWorkspace[],
	counts: WorkspaceCountSummary,
	extension: GeneratorDoctorExtension,
): GeneratorDoctorReportV1 => {
	const authoritativeCapabilities = contract.capabilities.filter(
		(capability) => capability.status === "authoritative",
	).length;
	const projectedWorkspaces = Object.freeze(
		workspaces.map((workspace) =>
			Object.freeze({
				path: workspace.path,
				name: workspace.name,
				classification: classificationLabel(workspace.classification),
			}),
		),
	);
	return Object.freeze({
		schema: "afenda.generator-doctor/v1",
		family: contract.family,
		release: contract.release.state,
		activeModes: Object.freeze(contract.modes.map((mode) => mode.id)),
		authoritativeCapabilities,
		scope: "workspace-discovery-and-contract-diagnostics",
		discovery: Object.freeze({
			...counts,
			reconciliation: `${counts.total}=${counts.kernelCandidates}+${counts.erpCandidates}+${counts.outsideFamilyScope}`,
			workspaces: projectedWorkspaces,
		}),
		extension: extension.json,
		diagnostics: createGeneratorDiagnosticReport({
			diagnostics: extension.diagnostics,
		}),
	});
};

const renderDoctorReportText = (report: GeneratorDoctorReportV1): string => {
	const workspaceLines = report.discovery.workspaces.map(
		(workspace) =>
			`${workspace.path}|${workspace.name}|${workspace.classification}`,
	);
	const discoveryReport = [
		`${report.family}-generator contract is valid`,
		`release=${report.release}`,
		`active-modes=${report.activeModes.join(", ")}`,
		`authoritative-capabilities=${report.authoritativeCapabilities}`,
		`scope=${report.scope}`,
		`workspace-count=${report.discovery.total}`,
		`kernel-candidates=${report.discovery.kernelCandidates}`,
		`erp-candidates=${report.discovery.erpCandidates}`,
		`outside-family-scope=${report.discovery.outsideFamilyScope}`,
		`workspace-reconciliation=${report.discovery.reconciliation}`,
		...workspaceLines,
		...renderExtensionTextLines(report.extension),
	].join("; ");
	const diagnosticReport = renderGeneratorDiagnosticReportText(
		report.diagnostics,
	).trimEnd();
	return `${discoveryReport}\n${diagnosticReport}`;
};

const renderDoctorReportJson = (report: GeneratorDoctorReportV1): string =>
	`${JSON.stringify(report, null, 2)}\n`;

const renderPlanJson = (plan: GeneratorReconciliationPlanV1): string =>
	`${JSON.stringify(plan, null, 2)}\n`;

const renderDoctorReport = (
	report: GeneratorDoctorReportV1,
	format: GeneratorDoctorOutputFormat,
): string => {
	switch (format) {
		case "json":
			return renderDoctorReportJson(report);
		case "text":
			return renderDoctorReportText(report);
		default:
			return format satisfies never;
	}
};

const isDoctorOutputFormat = (
	format: unknown,
): format is GeneratorDoctorOutputFormat =>
	typeof format === "string" &&
	GENERATOR_DOCTOR_OUTPUT_FORMATS.some((candidate) => candidate === format);

const parseDoctorOutputFormat = (
	format: unknown,
): GeneratorDoctorOutputFormat => {
	if (format === undefined) {
		return "text";
	}
	if (isDoctorOutputFormat(format)) {
		return format;
	}
	throw new GeneratorDoctorOutputFormatError(format);
};

const parsePlanOutputFormat = (format: unknown): GeneratorPlanOutputFormat => {
	if (format === undefined) {
		return "text";
	}
	if (format === "text" || format === "json") {
		return format;
	}
	throw new GeneratorDoctorOutputFormatError(format);
};

const renderPlan = (
	plan: GeneratorReconciliationPlanV1,
	format: GeneratorPlanOutputFormat,
): string => {
	switch (format) {
		case "json":
			return renderPlanJson(plan);
		case "text":
			return renderGeneratorReconciliationPlanText(plan);
		default:
			return format satisfies never;
	}
};

const createEmptyDoctorExtension = (
	family: GeneratorFamily,
): GeneratorDoctorExtension =>
	Object.freeze({
		kind: "none",
		json: Object.freeze({ kind: "none", family }),
		diagnostics: Object.freeze([]),
		textLines: Object.freeze([]),
	});

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const renderExtensionTextLines = (extension: unknown): readonly string[] => {
	if (!isUnknownRecord(extension)) {
		return Object.freeze([]);
	}
	const maybeTextLines = extension.textLines;
	return Array.isArray(maybeTextLines) &&
		maybeTextLines.every((value) => typeof value === "string")
		? Object.freeze([...maybeTextLines])
		: Object.freeze([]);
};

const classificationLabel = (
	classification: WorkspaceFamilyClassification,
): string =>
	classification.kind === "generator-family"
		? `${classification.family}-candidate`
		: classification.kind;

const summarizeWorkspaceCounts = (
	workspaces: readonly DiscoveredWorkspace[],
): WorkspaceCountSummary => {
	let kernelCandidates = 0;
	let erpCandidates = 0;
	let outsideFamilyScope = 0;
	for (const workspace of workspaces) {
		if (workspace.classification.kind === "outside-generator-families") {
			outsideFamilyScope += 1;
		} else if (workspace.classification.family === "kernel") {
			kernelCandidates += 1;
		} else {
			erpCandidates += 1;
		}
	}
	return Object.freeze({
		total: workspaces.length,
		kernelCandidates,
		erpCandidates,
		outsideFamilyScope,
	});
};

export const createFamilyRegistration = (
	contract: GeneratorFamilyContractDefinition,
	contracts: GeneratorContractRegistry,
	registrationOptions: CreateFamilyRegistrationOptions = {},
): GeneratorFamilyRegistration => {
	const name = `${contract.family}-generator` as const;
	const createExtension = async (
		repositoryRoot: string,
		workspaces: readonly DiscoveredWorkspace[],
	): Promise<GeneratorDoctorExtension> =>
		registrationOptions.createDoctorExtension === undefined
			? createEmptyDoctorExtension(contract.family)
			: registrationOptions.createDoctorExtension({
					repositoryRoot,
					workspaces,
				});
	const doctor = async (
		repositoryRoot: string,
		doctorOptions: GeneratorDoctorOptions = {},
	): Promise<string> => {
		const format = parseDoctorOutputFormat(doctorOptions.format);
		const discovery = await discoverWorkspaces({ contracts, repositoryRoot });
		const counts = summarizeWorkspaceCounts(discovery.workspaces);
		const extension = await createExtension(
			repositoryRoot,
			discovery.workspaces,
		);
		const report = createDoctorReport(
			contract,
			discovery.workspaces,
			counts,
			extension,
		);
		return renderDoctorReport(report, format);
	};
	const planUpgrade = async (
		repositoryRoot: string,
		planOptions: GeneratorPlanOptions = {},
	): Promise<string> => {
		const format = parsePlanOutputFormat(planOptions.format);
		const discovery = await discoverWorkspaces({ contracts, repositoryRoot });
		const extension = await createExtension(
			repositoryRoot,
			discovery.workspaces,
		);
		return renderPlan(
			createGeneratorReconciliationPlan({
				family: contract.family,
				diagnostics: extension.diagnostics,
			}),
			format,
		);
	};
	const planName = `${name}-plan-upgrade` as const;
	const planJsonName = `${name}-plan-upgrade-json` as const;
	const runDoctor: PlopTypes.CustomActionFunction = (_answers, _config, plop) =>
		doctor(plop.getDestBasePath());
	const runPlanUpgrade: PlopTypes.CustomActionFunction = (
		_answers,
		_config,
		plop,
	) => planUpgrade(plop.getDestBasePath());
	const runPlanUpgradeJson: PlopTypes.CustomActionFunction = (
		_answers,
		_config,
		plop,
	) => planUpgrade(plop.getDestBasePath(), { format: "json" });
	return Object.freeze({
		name,
		planName,
		planJsonName,
		contract,
		doctor,
		planUpgrade,
		register: (plop: GeneratorRegistrar): void => {
			plop.setGenerator(name, {
				description: `${contract.family} generator (${describeActiveModes(contract)}: internal discovery and contract diagnostics only)`,
				prompts: [],
				actions: [runDoctor],
			});
			plop.setGenerator(planName, {
				description: `${contract.family} generator (${describeActiveModes(contract)}: read-only upgrade plan)`,
				prompts: [],
				actions: [runPlanUpgrade],
			});
			plop.setGenerator(planJsonName, {
				description: `${contract.family} generator (${describeActiveModes(contract)}: read-only JSON upgrade plan)`,
				prompts: [],
				actions: [runPlanUpgradeJson],
			});
		},
	});
};
