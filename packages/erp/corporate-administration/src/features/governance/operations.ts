import {
	defineCorporateAdministrationCommand as command,
	defineCorporateAdministrationQuery as query,
} from "../../kernel/operations/types";

const owner = "governance" as const;
const read = "corporate_administration.governance.read" as const;
const manage = "corporate_administration.governance.manage" as const;

export const governanceOperationDefinitions = [
	command({
		id: "createGovernanceBody",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.governance-body.create",
		eventType: "corporate_administration.governance_body.created.v1",
	}),
	command({
		id: "amendGovernanceBody",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.governance-body.amend",
		eventType: "corporate_administration.governance_body.amended.v1",
	}),
	command({
		id: "retireGovernanceBody",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.governance-body.retire",
		eventType: "corporate_administration.governance_body.retired.v1",
	}),
	command({
		id: "appointGovernanceMember",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.governance-membership.appoint",
		eventType: "corporate_administration.governance_membership.appointed.v1",
	}),
	command({
		id: "changeGovernanceMembership",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.governance-membership.change",
		eventType: "corporate_administration.governance_membership.changed.v1",
	}),
	command({
		id: "endGovernanceMembership",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.governance-membership.end",
		eventType: "corporate_administration.governance_membership.ended.v1",
	}),
	query({ id: "getGovernanceBody", owner, permission: read }),
	query({ id: "listGovernanceBodiesAsOf", owner, permission: read }),
	query({ id: "listGovernanceMembershipsAsOf", owner, permission: read }),
] as const;
