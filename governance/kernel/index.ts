export {
	isKernelBand,
	KERNEL_BAND_IDS,
	KERNEL_BAND_PATH_PREFIX,
	type KernelBand,
} from "./bands.ts";
export { compareAsciiOrdinal } from "./compare.ts";
export {
	KernelDocProjectionError,
	parseKernelGovernanceDocRows,
	parseKernelPrdIndexRows,
} from "./doc-projection.ts";
export type {
	KernelGovernanceDocRow,
	KernelPrdIndexRow,
} from "./doc-rows.ts";
export {
	isKernelEnforcementGateId,
	KERNEL_ENFORCEMENT_CONTRACTS,
	KERNEL_ENFORCEMENT_GATE_IDS,
	type KernelEnforcementContractName,
	type KernelEnforcementDeclaration,
	type KernelEnforcementGateId,
} from "./enforcement-contracts.ts";
export {
	isKernelEnforcementProfileId,
	KERNEL_ENFORCEMENT_PROFILE_IDS,
	type KernelEnforcementProfileId,
} from "./enforcement-profiles.ts";
export { createIdGuard } from "./id-set.ts";
export {
	KERNEL_PACKAGE_NAMES,
	KERNEL_PACKAGES,
	type KernelPackageName,
	listKernelPackagesByBand,
	REGISTERED_KERNEL_PACKAGES_FOR_ADOPTION,
	type RegisteredKernelPackageForAdoption,
} from "./package-registry.ts";
export {
	isKernelAdmissionState,
	isKernelCriticality,
	isKernelKind,
	isKernelPersistenceMode,
	isKernelSurface,
	isKernelTopologyProfile,
	KERNEL_ADMISSION_STATES,
	KERNEL_CRITICALITIES,
	KERNEL_KINDS,
	KERNEL_PERSISTENCE_MODES,
	KERNEL_SURFACES,
	KERNEL_TOPOLOGY_PROFILES,
	type KernelAdmissionState,
	type KernelCriticality,
	type KernelKind,
	type KernelPackageRecord,
	type KernelPackageRegistry,
	type KernelPersistenceMode,
	type KernelSurface,
	type KernelTopologyProfile,
} from "./types.ts";
export {
	buildExpectedGovernanceDocRows,
	buildExpectedPrdIndexRows,
	CANONICAL_KERNEL_PACKAGE_COUNT,
	isKernelGovernanceIssueCode,
	KERNEL_GOVERNANCE_ISSUE_CODES,
	KERNEL_ROOT_ENTRYPOINT,
	type KernelGovernanceIssue,
	type KernelGovernanceIssueCode,
	type KernelGovernanceReport,
	type KernelGovernanceValidationContext,
	validateKernelGovernance,
} from "./validator.ts";
