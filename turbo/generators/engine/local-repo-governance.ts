import { generatorRegistrations } from "../config.ts";

export const GENERATOR_LOCAL_REPO_GOVERNANCE_SCHEMA =
	"afenda.generator-local-repo-governance/v1" as const;

export type GeneratorLocalSliceId = "G15" | "G16" | "G17";

export interface GeneratorLocalSliceStatus {
	readonly ciRequired: false;
	readonly id: GeneratorLocalSliceId;
	readonly localOnly: true;
	readonly status: "complete";
	readonly title: string;
}

export interface GeneratorLocalCommandCatalogEntry {
	readonly family: "erp" | "kernel";
	readonly name: string;
	readonly source: "family-registration" | "explicit-local-generator";
	readonly writes: boolean;
}

export interface GeneratorLocalRepoGovernanceReportV1 {
	readonly commandCatalog: readonly GeneratorLocalCommandCatalogEntry[];
	readonly localOnly: {
		readonly ciRequired: false;
		readonly excludedCiPaths: readonly [
			".github/workflows/ci.yml",
			".github/workflows/deploy.yml",
		];
	};
	readonly schema: typeof GENERATOR_LOCAL_REPO_GOVERNANCE_SCHEMA;
	readonly slices: readonly GeneratorLocalSliceStatus[];
	readonly stopBoundary: {
		readonly nextGeneratorSlice: null;
		readonly remainingSlices: readonly [];
		readonly reopeningRequiresNewContract: true;
	};
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

const LOCAL_GENERATOR_SLICES = Object.freeze([
	{
		id: "G15",
		title: "local-only generator closure governance",
		localOnly: true,
		ciRequired: false,
		status: "complete",
	},
	{
		id: "G16",
		title: "local generator command catalog",
		localOnly: true,
		ciRequired: false,
		status: "complete",
	},
	{
		id: "G17",
		title: "generator stop boundary",
		localOnly: true,
		ciRequired: false,
		status: "complete",
	},
] satisfies readonly GeneratorLocalSliceStatus[]);
const EMPTY_REMAINING_SLICES = Object.freeze([] as const);

const EXCLUDED_CI_PATHS = Object.freeze([
	".github/workflows/ci.yml",
	".github/workflows/deploy.yml",
] as const);

const createCommandCatalog = (): readonly GeneratorLocalCommandCatalogEntry[] =>
	Object.freeze(
		generatorRegistrations
			.flatMap((registration) => {
				const baseCommands: readonly GeneratorLocalCommandCatalogEntry[] = [
					{
						family: registration.contract.family,
						name: registration.name,
						source: "family-registration",
						writes: false,
					},
					{
						family: registration.contract.family,
						name: registration.planName,
						source: "family-registration",
						writes: false,
					},
					{
						family: registration.contract.family,
						name: registration.planJsonName,
						source: "family-registration",
						writes: false,
					},
				];
				const explicitCommands: readonly GeneratorLocalCommandCatalogEntry[] =
					registration.contract.family === "erp"
						? [
								{
									family: "erp",
									name: "erp-generator-create-package",
									source: "explicit-local-generator",
									writes: true,
								},
								{
									family: "erp",
									name: "erp-generator-add-feature",
									source: "explicit-local-generator",
									writes: true,
								},
								{
									family: "erp",
									name: "erp-generator-reconcile-projection-locks",
									source: "explicit-local-generator",
									writes: true,
								},
							]
						: [
								{
									family: "kernel",
									name: "kernel-generator-apply-adoption",
									source: "explicit-local-generator",
									writes: true,
								},
							];
				return [...baseCommands, ...explicitCommands];
			})
			.sort((left, right) => compareText(left.name, right.name)),
	);

export const createGeneratorLocalRepoGovernanceReport =
	(): GeneratorLocalRepoGovernanceReportV1 =>
		Object.freeze({
			schema: GENERATOR_LOCAL_REPO_GOVERNANCE_SCHEMA,
			localOnly: Object.freeze({
				ciRequired: false,
				excludedCiPaths: EXCLUDED_CI_PATHS,
			}),
			slices: LOCAL_GENERATOR_SLICES,

			commandCatalog: createCommandCatalog(),
			stopBoundary: Object.freeze({
				nextGeneratorSlice: null,
				remainingSlices: EMPTY_REMAINING_SLICES,
				reopeningRequiresNewContract: true,
			}),
		});
