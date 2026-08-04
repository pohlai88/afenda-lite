import {
	defineCorporateAdministrationCommand as command,
	defineCorporateAdministrationProtectedRoleApprovalCommand as protectedRoleApprovalCommand,
	defineCorporateAdministrationQuery as query,
} from "../../kernel/operations/types";

const owner = "officers" as const;
const officerRead = "corporate_administration.officer.read" as const;
const officerManage = "corporate_administration.officer.manage" as const;
const complianceRead =
	"corporate_administration.officer_compliance.read" as const;
const complianceManage =
	"corporate_administration.officer_compliance.manage" as const;

export const officerOperationDefinitions = [
	command({
		id: "defineStatutoryOffice",
		owner,
		permission: officerManage,
		commandIdentity: "corporate-administration.statutory-office.define",
		eventType: "corporate_administration.statutory_office.defined.v1",
	}),
	protectedRoleApprovalCommand({
		id: "appointOfficer",
		owner,
		permission: officerManage,
		commandIdentity: "corporate-administration.officer.appoint",
		eventType: "corporate_administration.officer.appointed.v1",
	}),
	command({
		id: "amendOfficerAppointment",
		owner,
		permission: officerManage,
		commandIdentity: "corporate-administration.officer.amend-appointment",
		eventType: "corporate_administration.officer.appointment_amended.v1",
	}),
	command({
		id: "recordOfficerQualification",
		owner,
		permission: officerManage,
		commandIdentity: "corporate-administration.officer.record-qualification",
		eventType: "corporate_administration.officer.qualification_recorded.v1",
	}),
	command({
		id: "resignOfficer",
		owner,
		permission: officerManage,
		commandIdentity: "corporate-administration.officer.resign",
		eventType: "corporate_administration.officer.resigned.v1",
	}),
	command({
		id: "removeOfficer",
		owner,
		permission: officerManage,
		commandIdentity: "corporate-administration.officer.remove",
		eventType: "corporate_administration.officer.removed.v1",
	}),
	command({
		id: "recordOfficerDeclaration",
		owner,
		permission: complianceManage,
		commandIdentity: "corporate-administration.officer.record-declaration",
		eventType: "corporate_administration.officer.declaration_recorded.v1",
	}),
	command({
		id: "supersedeOfficerDeclaration",
		owner,
		permission: complianceManage,
		commandIdentity: "corporate-administration.officer.supersede-declaration",
		eventType: "corporate_administration.officer.declaration_superseded.v1",
	}),
	command({
		id: "recordOfficerDisqualification",
		owner,
		permission: complianceManage,
		commandIdentity: "corporate-administration.officer.record-disqualification",
		eventType: "corporate_administration.officer.disqualified.v1",
	}),
	command({
		id: "endOfficerDisqualification",
		owner,
		permission: complianceManage,
		commandIdentity: "corporate-administration.officer.end-disqualification",
		eventType: "corporate_administration.officer.disqualification_ended.v1",
	}),
	command({
		id: "discloseConflict",
		owner,
		permission: complianceManage,
		commandIdentity: "corporate-administration.conflict.disclose",
		eventType: "corporate_administration.conflict.disclosed.v1",
	}),
	command({
		id: "recordRecusal",
		owner,
		permission: complianceManage,
		commandIdentity: "corporate-administration.conflict.record-recusal",
		eventType: "corporate_administration.conflict.recusal_recorded.v1",
	}),
	query({ id: "listRequiredStatutoryOffices", owner, permission: officerRead }),
	query({ id: "listOfficersAsOf", owner, permission: officerRead }),
	query({ id: "getOfficerAppointment", owner, permission: officerRead }),
	query({ id: "getOfficerVacancyStatus", owner, permission: officerRead }),
	query({ id: "getOfficerEligibilityAsOf", owner, permission: complianceRead }),
	query({ id: "listExpiringDeclarations", owner, permission: complianceRead }),
	query({
		id: "listActiveDisqualifications",
		owner,
		permission: complianceRead,
	}),
	query({ id: "listConflictsForMatter", owner, permission: complianceRead }),
] as const;
