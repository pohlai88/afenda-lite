/**
 * Governance permission catalogue.
 *
 * Approval and application permissions remain intentionally separate to
 * preserve maker-checker and segregation-of-duties controls.
 */
export const GOVERNANCE_PERMISSION_CODES = [
	"master_data.change_request_read",
	"master_data.change_request_create",
	"master_data.change_request_update",
	"master_data.change_request_submit",
	"master_data.change_request_review",
	"master_data.change_request_approve",
	"master_data.change_request_reject",
	"master_data.change_request_apply",
	"master_data.change_request_cancel",
	"master_data.import_read",
	"master_data.import_create",
	"master_data.import_validate",
	"master_data.import_submit",
	"master_data.import_approve",
	"master_data.import_reject",
	"master_data.import_apply",
	"master_data.import_retry",
	"master_data.import_cancel",
	"master_data.duplicate_read",
	"master_data.duplicate_review",
	"master_data.duplicate_resolve",
	"master_data.party_merge_request",
	"master_data.party_merge_review",
	"master_data.party_merge_approve",
	"master_data.party_merge_reject",
	"master_data.party_merge",
	"master_data.party_merge_cancel",
] as const;

export type GovernancePermission = (typeof GOVERNANCE_PERMISSION_CODES)[number];

const GOVERNANCE_PERMISSION_SET: ReadonlySet<string> = new Set(
	GOVERNANCE_PERMISSION_CODES,
);

export const GOVERNANCE_READ_PERMISSIONS = [
	"master_data.change_request_read",
	"master_data.import_read",
	"master_data.duplicate_read",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_CREATE_PERMISSIONS = [
	"master_data.change_request_create",
	"master_data.import_create",
	"master_data.party_merge_request",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_UPDATE_PERMISSIONS = [
	"master_data.change_request_update",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_SUBMISSION_PERMISSIONS = [
	"master_data.change_request_submit",
	"master_data.import_submit",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_REVIEW_PERMISSIONS = [
	"master_data.change_request_review",
	"master_data.import_validate",
	"master_data.duplicate_review",
	"master_data.party_merge_review",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_APPROVAL_PERMISSIONS = [
	"master_data.change_request_approve",
	"master_data.import_approve",
	"master_data.party_merge_approve",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_REJECTION_PERMISSIONS = [
	"master_data.change_request_reject",
	"master_data.import_reject",
	"master_data.party_merge_reject",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_APPLICATION_PERMISSIONS = [
	"master_data.change_request_apply",
	"master_data.import_apply",
	"master_data.party_merge",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_RESOLUTION_PERMISSIONS = [
	"master_data.duplicate_resolve",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_CANCELLATION_PERMISSIONS = [
	"master_data.change_request_cancel",
	"master_data.import_cancel",
	"master_data.party_merge_cancel",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_RETRY_PERMISSIONS = [
	"master_data.import_retry",
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_MUTATION_PERMISSIONS = [
	...GOVERNANCE_CREATE_PERMISSIONS,
	...GOVERNANCE_UPDATE_PERMISSIONS,
	...GOVERNANCE_SUBMISSION_PERMISSIONS,
	...GOVERNANCE_REVIEW_PERMISSIONS,
	...GOVERNANCE_APPROVAL_PERMISSIONS,
	...GOVERNANCE_REJECTION_PERMISSIONS,
	...GOVERNANCE_APPLICATION_PERMISSIONS,
	...GOVERNANCE_RESOLUTION_PERMISSIONS,
	...GOVERNANCE_CANCELLATION_PERMISSIONS,
	...GOVERNANCE_RETRY_PERMISSIONS,
] as const satisfies readonly GovernancePermission[];

export const GOVERNANCE_SEGREGATED_PERMISSION_PAIRS = [
	["master_data.change_request_approve", "master_data.change_request_apply"],
	["master_data.import_approve", "master_data.import_apply"],
	["master_data.party_merge_approve", "master_data.party_merge"],
] as const satisfies readonly (readonly [
	GovernancePermission,
	GovernancePermission,
])[];

export function isGovernancePermission(
	value: string,
): value is GovernancePermission {
	return GOVERNANCE_PERMISSION_SET.has(value);
}

export function assertGovernancePermission(
	value: string,
): asserts value is GovernancePermission {
	if (!isGovernancePermission(value)) {
		throw new Error(`Unknown governance permission: ${value}`);
	}
}

export function isGovernanceApprovalPermission(
	permission: GovernancePermission,
): boolean {
	return includesPermission(GOVERNANCE_APPROVAL_PERMISSIONS, permission);
}

export function isGovernanceApplicationPermission(
	permission: GovernancePermission,
): boolean {
	return includesPermission(GOVERNANCE_APPLICATION_PERMISSIONS, permission);
}

export function isGovernanceMutationPermission(
	permission: GovernancePermission,
): boolean {
	return includesPermission(GOVERNANCE_MUTATION_PERMISSIONS, permission);
}

function includesPermission(
	permissions: readonly GovernancePermission[],
	permission: GovernancePermission,
): boolean {
	return permissions.includes(permission);
}
