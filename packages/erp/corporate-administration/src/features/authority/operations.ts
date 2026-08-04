import {
	defineCorporateAdministrationCommand as command,
	defineCorporateAdministrationProtectedRoleApprovalCommand as protectedRoleApprovalCommand,
	defineCorporateAdministrationQuery as query,
} from "../../kernel/operations/types";

const owner = "authority" as const;
const authorityRead = "corporate_administration.authority.read" as const;
const authorityManage = "corporate_administration.authority.manage" as const;

export const authorityOperationDefinitions = [
	protectedRoleApprovalCommand({
		id: "grantAuthorityMandate",
		owner,
		permission: authorityManage,
		commandIdentity: "corporate-administration.authority.grant",
		eventType: "corporate_administration.authority_mandate.granted.v1",
	}),
	command({
		id: "amendAuthorityMandate",
		owner,
		permission: authorityManage,
		commandIdentity: "corporate-administration.authority.amend",
		eventType: "corporate_administration.authority_mandate.amended.v1",
	}),
	command({
		id: "revokeAuthorityMandate",
		owner,
		permission: authorityManage,
		commandIdentity: "corporate-administration.authority.revoke",
		eventType: "corporate_administration.authority_mandate.revoked.v1",
	}),
	query({ id: "listAuthorityMandatesAsOf", owner, permission: authorityRead }),
	query({ id: "getAuthorityMandate", owner, permission: authorityRead }),
] as const;
