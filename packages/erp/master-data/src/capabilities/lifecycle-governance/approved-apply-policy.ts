import { errorResult, type Result } from "@afenda/errors";

export const APPROVED_APPLY_REVALIDATION_REQUIREMENTS = [
	"current_record_version",
	"current_lifecycle_state",
	"current_dependencies",
	"current_authorization",
	"current_uniqueness_constraints",
	"current_parent_child_invariants",
	"current_merge_status",
] as const;

export type ApprovedApplyRevalidationRequirement =
	(typeof APPROVED_APPLY_REVALIDATION_REQUIREMENTS)[number];

export type ApprovedApplyAttemptGate = Readonly<{
	approvalSource: "change_request" | "import_batch";
	revalidatedBy:
		| "named_domain_command"
		| "package_import_apply"
		| "package_merge_command";
	requirements: typeof APPROVED_APPLY_REVALIDATION_REQUIREMENTS;
}>;

export function approvedApplyAttemptGate(
	approvalSource: ApprovedApplyAttemptGate["approvalSource"],
	revalidatedBy: ApprovedApplyAttemptGate["revalidatedBy"],
): Result<ApprovedApplyAttemptGate> {
	return errorResult.ok({
		approvalSource,
		revalidatedBy,
		requirements: APPROVED_APPLY_REVALIDATION_REQUIREMENTS,
	});
}
