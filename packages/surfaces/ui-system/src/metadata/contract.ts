export const UI_LIFECYCLES = [
	"specified",
	"implemented",
	"verified",
	"deprecated",
] as const;

export type UiLifecycle = (typeof UI_LIFECYCLES)[number];

export const UI_LAYERS = [
	"foundation",
	"primitive",
	"compound",
	"pattern",
] as const;

export type UiLayer = (typeof UI_LAYERS)[number];

export const UI_FAMILIES = [
	"actions",
	"forms",
	"data",
	"navigation",
	"overlays",
	"feedback",
	"workflow",
	"analytics",
	"layout",
] as const;

export type UiFamily = (typeof UI_FAMILIES)[number];

export type UiRenderMode = "client" | "server-compatible";

export const UI_STATES = [
	"default",
	"hover",
	"focus-visible",
	"disabled",
	"loading",
	"empty",
	"filtered-empty",
	"error",
	"invalid",
	"selected",
	"checked",
	"expanded",
	"open",
	"read-only",
	"success",
	"warning",
	"info",
	"destructive",
] as const;

export type UiState = (typeof UI_STATES)[number];

export const UI_EVIDENCE_KINDS = [
	"contract",
	"interaction",
	"axe",
	"rsc",
	"contrast",
	"consumer",
] as const;

export type UiEvidenceKind = (typeof UI_EVIDENCE_KINDS)[number];

export const UI_QUALITY_PROFILE_IDS = [
	"static-display",
	"interactive-control",
	"form-control",
	"modal-overlay",
	"collection-navigation",
	"async-data",
	"status-feedback",
	"workflow-history",
	"data-visualization",
] as const;

export type UiQualityProfileId = (typeof UI_QUALITY_PROFILE_IDS)[number];

export const UI_TOKEN_FAMILY_IDS = [
	"core-surface",
	"status",
	"data",
	"control",
	"focus",
	"chart",
	"data-series",
	"motion",
] as const;

export type UiTokenFamilyId = (typeof UI_TOKEN_FAMILY_IDS)[number];

export const UI_CAPABILITY_IDS = [
	"ui.foundation.theme",
	"ui.foundation.status",
	"ui.action.trigger",
	"ui.action.group",
	"ui.form.field",
	"ui.form.text",
	"ui.form.multiline",
	"ui.form.boolean",
	"ui.form.choice",
	"ui.form.search-choice",
	"ui.form.date",
	"ui.form.date-range",
	"ui.form.datetime",
	"ui.form.numeric",
	"ui.form.money",
	"ui.form.quantity",
	"ui.form.percent",
	"ui.form.file",
	"ui.data.table",
	"ui.data.filter",
	"ui.data.saved-view",
	"ui.data.column-visibility",
	"ui.data.bulk-actions",
	"ui.data.tree",
	"ui.data.key-value",
	"ui.data.label",
	"ui.data.metric",
	"ui.navigation.workspace",
	"ui.navigation.breadcrumb",
	"ui.navigation.tabs",
	"ui.navigation.pagination",
	"ui.navigation.command",
	"ui.overlay.modal",
	"ui.overlay.drawer",
	"ui.overlay.popover",
	"ui.feedback.alert",
	"ui.feedback.toast",
	"ui.feedback.async-state",
	"ui.feedback.status",
	"ui.workflow.stepper",
	"ui.workflow.timeline",
	"ui.workflow.audit",
	"ui.workflow.diff",
	"ui.analytics.chart",
	"ui.layout.workspace-page",
	"ui.layout.page-heading",
	"ui.layout.section-heading",
	"ui.layout.entity-heading",
	"ui.layout.toolbar",
	"ui.layout.master-detail",
	"ui.layout.disclosure",
] as const;

export type UiCapabilityId = (typeof UI_CAPABILITY_IDS)[number];

export const UI_SURFACE_PROFILE_IDS = [
	"workspace-shell",
	"dashboard-metrics",
	"record-list",
	"record-detail",
	"record-editor",
	"transaction-lines",
	"search-filtering",
	"bulk-operations",
	"lifecycle-workflow",
	"approval-workflow",
	"audit-history",
	"documents-attachments",
	"hierarchical-data",
	"analytics-charts",
	"async-permission-states",
] as const;

export type UiSurfaceProfileId = (typeof UI_SURFACE_PROFILE_IDS)[number];

export const ERP_MODULE_IDS = [
	"accounting",
	"corporate-administration",
	"fulfillment",
	"human-resources",
	"inventory",
	"master-data",
	"payables",
	"payments",
	"payroll",
	"purchasing",
	"receivables",
	"receiving",
	"sales",
] as const;

export type ErpModuleId = (typeof ERP_MODULE_IDS)[number];

export interface UiEvidence {
	kind: UiEvidenceKind;
	path: string;
}

export type ComponentLifecycle =
	| "candidate"
	| "approved"
	| "verified"
	| "deprecated";

export type EvidenceKind =
	| "contract"
	| "unit"
	| "interaction"
	| "accessibility"
	| "visual"
	| "contrast";

export type GovernanceEvidenceKind = EvidenceKind;

export interface ComponentEvidence {
	readonly file: string;
	readonly kind: GovernanceEvidenceKind;
	readonly target: string;
}

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export interface UsageRule {
	readonly allowedWhen: NonEmptyReadonlyArray<string>;
	readonly meaning: string;
	readonly prohibitedWhen?: NonEmptyReadonlyArray<string>;
}

export type UiComponentContractStandard = "afenda.ui-component-contract/v1";

export type ComponentContractOwnership = Readonly<{
	componentOwns: NonEmptyReadonlyArray<string>;
	consumerOwns: NonEmptyReadonlyArray<string>;
}>;

export type ComponentConsumerEnforcement = Readonly<{
	/** Local declaration names that would duplicate this canonical capability. */
	forbiddenLocalComponentNames: NonEmptyReadonlyArray<string>;
}>;

export interface GovernedComponentContract {
	readonly accessibility: NonEmptyReadonlyArray<string>;
	readonly approvedSizes?: Readonly<Record<string, UsageRule>>;
	readonly approvedVariants?: Readonly<Record<string, UsageRule>>;
	readonly component: UiComponentMetadata["id"];
	readonly consumerEnforcement?: ComponentConsumerEnforcement;
	readonly id: `${UiComponentMetadata["id"]}.contract`;
	readonly ownership: ComponentContractOwnership;
	readonly prohibitedUsage: NonEmptyReadonlyArray<string>;
	readonly purpose: string;
	readonly rules: NonEmptyReadonlyArray<string>;
	/** Interpretations or decisions that the component must not imply. */
	readonly semanticBoundaries: NonEmptyReadonlyArray<string>;
	readonly standard: UiComponentContractStandard;
}

export type ComponentContractInput = GovernedComponentContract;

export interface ComponentGovernance {
	readonly contract?: GovernedComponentContract;
	readonly deprecatedBy?: UiComponentMetadata["id"];
	readonly evidence?: readonly ComponentEvidence[];
	readonly lifecycle: ComponentLifecycle;
	readonly notes?: readonly string[];
}

export interface UiComponentMetadata {
	capabilities: readonly UiCapabilityId[];
	evidence: readonly UiEvidence[];
	family: UiFamily;
	governance?: ComponentGovernance;
	id: `ui.${string}`;
	layer: UiLayer;
	lifecycle: ComponentLifecycle;
	name: string;
	publicExports: readonly string[];
	qualityProfiles: readonly UiQualityProfileId[];
	renderMode: UiRenderMode;
	requiredStates: readonly UiState[];
	sizes?: readonly string[];
	sourceModule: `src/${"app-shell" | "blocks" | "components/ui"}/${string}.ts${"" | "x"}`;
	tokenFamilies: readonly UiTokenFamilyId[];
	variants?: readonly string[];
}

export interface UiCapabilityMetadata {
	description: string;
	family: UiFamily;
	id: UiCapabilityId;
	lifecycle: UiLifecycle;
	providers: readonly UiComponentMetadata["id"][];
}

export interface UiQualityProfileMetadata {
	id: UiQualityProfileId;
	requiredEvidence: readonly UiEvidenceKind[];
	requiredStates: readonly UiState[];
}

export interface UiSurfaceProfileMetadata {
	capabilities: readonly UiCapabilityId[];
	id: UiSurfaceProfileId;
}

export interface UiModuleCoverageMetadata {
	moduleId: ErpModuleId;
	profiles: readonly UiSurfaceProfileId[];
}

export interface UiTokenFamilyMetadata {
	id: UiTokenFamilyId;
	requiredThemes: "both" | "root-only";
	variables: readonly `--${string}`[];
}

export interface UiCatalog {
	baseline: {
		id: "erp-ui-v1";
		version: 1;
		state: "locked";
		lockedOn: `${number}-${number}-${number}`;
	};
	capabilities: readonly UiCapabilityMetadata[];
	components: readonly UiComponentMetadata[];
	moduleCoverage: readonly UiModuleCoverageMetadata[];
	qualityProfiles: readonly UiQualityProfileMetadata[];
	surfaceProfiles: readonly UiSurfaceProfileMetadata[];
	tokenFamilies: readonly UiTokenFamilyMetadata[];
}

export interface UiRepositorySnapshot {
	barrelSource: string;
	componentSources: Readonly<Record<string, string>>;
	consumerDeclarationsBySource: Readonly<Record<string, readonly string[]>>;
	erpModuleIds: readonly string[];
	evidencePaths: readonly string[];
	exportsBySource: Readonly<Record<string, readonly string[]>>;
	packageExportKeys: readonly string[];
	tokenCss: string;
}

export type UiCatalogIssue =
	| { kind: "component-drift"; message: string }
	| { kind: "export-drift"; message: string }
	| { kind: "capability-drift"; message: string }
	| { kind: "quality-drift"; message: string }
	| { kind: "surface-drift"; message: string }
	| { kind: "module-drift"; message: string }
	| { kind: "token-drift"; message: string }
	| { kind: "boundary-drift"; message: string }
	| { kind: "consumer-drift"; message: string }
	| { kind: "baseline-drift"; message: string };

export type GovernedCatalogComponent = Pick<
	UiComponentMetadata,
	"name" | "lifecycle" | "evidence"
> & {
	readonly variants?: readonly string[];
	readonly sizes?: readonly string[];
	readonly governance?: ComponentGovernance;
};

export type GovernanceDiagnosticCode =
	| "duplicate_component"
	| "contract_component_mismatch"
	| "invalid_contract_standard"
	| "missing_contract_ownership"
	| "missing_semantic_boundary"
	| "invalid_contract_clause"
	| "duplicate_contract_clause"
	| "missing_contract"
	| "missing_evidence"
	| "unexpected_evidence"
	| "missing_variant"
	| "unexpected_variant"
	| "missing_size"
	| "unexpected_size"
	| "missing_deprecation_replacement"
	| "invalid_deprecation_replacement"
	| "invalid_evidence";

export interface GovernanceDiagnostic {
	readonly code: GovernanceDiagnosticCode;
	readonly component: string;
	readonly message: string;
	readonly severity: "error" | "warning";
}

export interface GovernanceValidationResult {
	readonly diagnostics: readonly GovernanceDiagnostic[];
	readonly ok: boolean;
}

export function defineComponentContract<
	const TContract extends GovernedComponentContract,
>(contract: TContract): TContract {
	return contract;
}

export function defineComponentGovernance<
	const TGovernance extends ComponentGovernance,
>(governance: TGovernance): TGovernance {
	return governance;
}
