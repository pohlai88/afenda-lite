import { HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID } from "../../kernel/authorization/authorization-policy-ids";
import {
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	type HumanResourcesPermission,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const OWNER = "reporting-bulk-reliability" as const;

function definition(
	kind: "command" | "query",
	permission: HumanResourcesPermission,
) {
	return {
		authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID,
		kind,
		owner: OWNER,
		permission,
		resourceKind: "compensation" as const,
	};
}

export const HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES =
	defineHumanResourcesOperationRegistry({
		/**
		 * Machine-to-machine doctrine (2026-08-05, D0 review): the assemble stays
		 * on `compensation.read` rather than `sensitive-identifiers.read`. It is
		 * the payroll ingest pipeline's single entrypoint — the caller is the
		 * payroll service principal, not a human reading statutory identifiers —
		 * and requiring the human-facing statutory permission would grant that
		 * principal the whole Stage-1 statutory read surface. The disclosure is
		 * instead constrained where it matters: `assembleApprovedPayrollHandoff`
		 * evaluates `isStatutorySubjectRestricted` and fails `CONFLICT` for a
		 * restriction-active subject, exactly like the Stage-1 reads do. Recorded
		 * in `packages/erp/payroll/docs/hr-payroll-decisions.md`.
		 */
		assembleApprovedPayrollHandoff: {
			sensitivity: {
				fieldClasses: ["compensation", "personal_identifiers"],
				resourceType: "personal_identifiers",
				subjectPolicy: "privileged_only",
			},
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			id: "human-resources.approved-payroll-handoff.get",
			observabilityArea: "payroll_delivery",
			publicName: "assembleApprovedPayrollHandoff",
		},
	});

export const HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES);
export const HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES);

export const {
	assembleApprovedPayrollHandoff: {
		id: HUMAN_RESOURCES_QUERY_APPROVED_PAYROLL_HANDOFF_GET,
	},
} = HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES;
