import type { PlopTypes } from "@turbo/gen";

import {
	createGeneratorDiagnosticReport,
	type GeneratorDiagnosticReportV1,
	renderGeneratorDiagnosticReportText,
} from "./diagnostic-protocol.ts";
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

export interface GeneratorFamilyRegistration {
	readonly contract: GeneratorFamilyContractDefinition;
	readonly doctor: (
		repositoryRoot: string,
		options?: GeneratorDoctorOptions,
	) => Promise<string>;
	readonly name: GeneratorName;
	readonly register: (plop: GeneratorRegistrar) => void;
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
	readonly family: GeneratorFamily;
	readonly release: GeneratorFamilyContractDefinition["release"]["state"];
	readonly schema: "afenda.generator-doctor/v1";
	readonly scope: "workspace-discovery-and-contract-diagnostics";
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
		diagnostics: createGeneratorDiagnosticReport({ diagnostics: [] }),
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
	].join("; ");
	const diagnosticReport = renderGeneratorDiagnosticReportText(
		report.diagnostics,
	).trimEnd();
	return `${discoveryReport}\n${diagnosticReport}`;
};

const renderDoctorReportJson = (report: GeneratorDoctorReportV1): string =>
	`${JSON.stringify(report, null, 2)}\n`;

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
): GeneratorFamilyRegistration => {
	const name = `${contract.family}-generator` as const;
	const doctor = async (
		repositoryRoot: string,
		options: GeneratorDoctorOptions = {},
	): Promise<string> => {
		const format = parseDoctorOutputFormat(options.format);
		const discovery = await discoverWorkspaces({ contracts, repositoryRoot });
		const counts = summarizeWorkspaceCounts(discovery.workspaces);
		const report = createDoctorReport(contract, discovery.workspaces, counts);
		return renderDoctorReport(report, format);
	};
	const runDoctor: PlopTypes.CustomActionFunction = (_answers, _config, plop) =>
		doctor(plop.getDestBasePath());
	return Object.freeze({
		name,
		contract,
		doctor,
		register: (plop: GeneratorRegistrar): void => {
			plop.setGenerator(name, {
				description: `${contract.family} generator (${describeActiveModes(contract)}: internal discovery and contract diagnostics only)`,
				prompts: [],
				actions: [runDoctor],
			});
		},
	});
};
