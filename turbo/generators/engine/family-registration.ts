import type { PlopTypes } from "@turbo/gen";

import type {
	GeneratorContractRegistry,
	GeneratorFamilyContractDefinition,
	GeneratorName,
} from "./types.ts";
import {
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

const describeActiveModes = (
	contract: GeneratorFamilyContractDefinition,
): string => contract.modes.map((mode) => mode.id).join(", ");

const createDoctorReport = (
	contract: GeneratorFamilyContractDefinition,
	workspaceLines: readonly string[],
	workspaceCount: number,
	familyCandidateCount: number,
): string => {
	const authoritativeCapabilities = contract.capabilities.filter(
		(capability) => capability.status === "authoritative",
	).length;
	return [
		`${contract.family}-generator contract is valid`,
		`release=${contract.release.state}`,
		`active-modes=${describeActiveModes(contract)}`,
		`authoritative-capabilities=${authoritativeCapabilities}`,
		"discovery-scope=workspace-candidates-only",
		`discovered-workspaces=${workspaceCount}`,
		`family-candidates=${familyCandidateCount}`,
		...workspaceLines,
	].join("; ");
};

const classificationLabel = (
	classification: WorkspaceFamilyClassification,
): string =>
	classification.kind === "generator-family"
		? `${classification.family}-candidate`
		: classification.kind;

export const createFamilyRegistration = (
	contract: GeneratorFamilyContractDefinition,
	contracts: GeneratorContractRegistry,
): GeneratorFamilyRegistration => {
	const name = `${contract.family}-generator` as const;
	const doctor = async (repositoryRoot: string): Promise<string> => {
		const discovery = await discoverWorkspaces({ contracts, repositoryRoot });
		const familyCandidateCount = discovery.workspaces.filter(
			(workspace) =>
				workspace.classification.kind === "generator-family" &&
				workspace.classification.family === contract.family,
		).length;
		const workspaceLines = discovery.workspaces.map(
			(workspace) =>
				`${workspace.path}|${workspace.name}|${classificationLabel(workspace.classification)}`,
		);
		return createDoctorReport(
			contract,
			workspaceLines,
			discovery.workspaces.length,
			familyCandidateCount,
		);
	};
	const runDoctor: PlopTypes.CustomActionFunction = (_answers, _config, plop) =>
		doctor(plop.getDestBasePath());
	return Object.freeze({
		name,
		contract,
		doctor,
		register: (plop: GeneratorRegistrar): void => {
			plop.setGenerator(name, {
				description: `${contract.family} generator (${describeActiveModes(contract)}: internal contract and workspace candidates only)`,
				prompts: [],
				actions: [runDoctor],
			});
		},
	});
};
