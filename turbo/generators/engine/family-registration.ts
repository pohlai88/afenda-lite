import type { PlopTypes } from "@turbo/gen";

import {
	createGeneratorDiagnosticReport,
	renderGeneratorDiagnosticReportText,
} from "./diagnostic-protocol.ts";
import type {
	GeneratorContractRegistry,
	GeneratorFamilyContractDefinition,
	GeneratorName,
} from "./types.ts";
import {
	type DiscoveredWorkspace,
	discoverWorkspaces,
	type WorkspaceFamilyClassification,
} from "./workspace-discovery.ts";

export interface GeneratorFamilyRegistration {
	readonly contract: GeneratorFamilyContractDefinition;
	readonly doctor: (repositoryRoot: string) => Promise<string>;
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

const describeActiveModes = (
	contract: GeneratorFamilyContractDefinition,
): string => contract.modes.map((mode) => mode.id).join(", ");

const createDoctorReport = (
	contract: GeneratorFamilyContractDefinition,
	workspaceLines: readonly string[],
	counts: WorkspaceCountSummary,
): string => {
	const authoritativeCapabilities = contract.capabilities.filter(
		(capability) => capability.status === "authoritative",
	).length;
	const discoveryReport = [
		`${contract.family}-generator contract is valid`,
		`release=${contract.release.state}`,
		`active-modes=${describeActiveModes(contract)}`,
		`authoritative-capabilities=${authoritativeCapabilities}`,
		"scope=workspace-discovery-and-contract-diagnostics",
		`workspace-count=${counts.total}`,
		`kernel-candidates=${counts.kernelCandidates}`,
		`erp-candidates=${counts.erpCandidates}`,
		`outside-family-scope=${counts.outsideFamilyScope}`,
		`workspace-reconciliation=${counts.total}=${counts.kernelCandidates}+${counts.erpCandidates}+${counts.outsideFamilyScope}`,
		...workspaceLines,
	].join("; ");
	const diagnosticReport = renderGeneratorDiagnosticReportText(
		createGeneratorDiagnosticReport({ diagnostics: [] }),
	).trimEnd();
	return `${discoveryReport}\n${diagnosticReport}`;
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
	const doctor = async (repositoryRoot: string): Promise<string> => {
		const discovery = await discoverWorkspaces({ contracts, repositoryRoot });
		const counts = summarizeWorkspaceCounts(discovery.workspaces);
		const workspaceLines = discovery.workspaces.map(
			(workspace) =>
				`${workspace.path}|${workspace.name}|${classificationLabel(workspace.classification)}`,
		);
		return createDoctorReport(contract, workspaceLines, counts);
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
