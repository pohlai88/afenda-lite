import { errorResult, type Result } from "@afenda/errors";
import type {
	ApprovalDecisionId,
	ApprovalRequestId,
	CommandFingerprint,
	OrganizationId,
	UserId,
} from "./kernel/brands";
import type {
	CorporateAdministrationCommandId,
	CorporateAdministrationQueryId,
} from "./module-ids";
import type { CorporateAdministrationPermission } from "./permissions";

export type CorporateAdministrationAuthorizationInput = Readonly<{
	organizationId: OrganizationId;
	actorUserId: UserId;
	permission: CorporateAdministrationPermission;
}>;

/**
 * Composition-injected authorization provider.
 *
 * Production execution context requires this port. There is no allow-all
 * default and no `module_admin` bypass inside this package — the provider
 * alone decides tenant capability.
 */
export type CorporateAdministrationAuthorizationContext = Readonly<{
	can: (input: CorporateAdministrationAuthorizationInput) => Promise<boolean>;
}>;

export type CorporateAdministrationApprovalDecision = Readonly<{
	organizationId: OrganizationId;
	approvalRequestId: ApprovalRequestId;
	approvalDecisionId: ApprovalDecisionId;
	commandFingerprint: CommandFingerprint;
	approved: boolean;
	approverUserId: UserId;
}>;

export type CorporateAdministrationApprovalDecisionPort = Readonly<{
	verify: (input: {
		organizationId: OrganizationId;
		approvalRequestId: ApprovalRequestId;
		approvalDecisionId: ApprovalDecisionId;
		commandFingerprint: CommandFingerprint;
	}) => Promise<Result<CorporateAdministrationApprovalDecision | null>>;
}>;

export type CorporateAdministrationApprovalVerificationDependencies = Readonly<{
	approvalDecisions?: CorporateAdministrationApprovalDecisionPort;
}>;

export const CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS = {
	registerLegalCompanyDraft: "corporate_administration.company.manage",
	updateLegalCompanyProfile: "corporate_administration.company.manage",
	addCompanyName: "corporate_administration.company.manage",
	supersedeCompanyName: "corporate_administration.company.manage",
	retireCompanyName: "corporate_administration.company.manage",
	setCompanyJurisdictionProfile: "corporate_administration.company.manage",
	supersedeCompanyJurisdictionProfile:
		"corporate_administration.company.manage",
	setCompanyLegalForm: "corporate_administration.company.manage",
	supersedeCompanyLegalForm: "corporate_administration.company.manage",
	registerCompanyIdentifier: "corporate_administration.company.manage",
	supersedeCompanyIdentifier: "corporate_administration.company.manage",
	retireCompanyIdentifier: "corporate_administration.company.manage",
	setCompanyFinancialYear: "corporate_administration.company.manage",
	registerCompanyActivity: "corporate_administration.company.manage",
	endCompanyActivity: "corporate_administration.company.manage",
	activateLegalCompany: "corporate_administration.company.manage",
	suspendLegalCompany: "corporate_administration.company.manage",
	markCompanyStruckOff: "corporate_administration.company.manage",
	enterLiquidation: "corporate_administration.company.manage",
	dissolveLegalCompany: "corporate_administration.company.manage",
	restoreLegalCompany: "corporate_administration.company.manage",
	archiveLegalCompany: "corporate_administration.company.manage",
	registerLegalEstablishment: "corporate_administration.establishment.manage",
	updateLegalEstablishment: "corporate_administration.establishment.manage",
	activateLegalEstablishment: "corporate_administration.establishment.manage",
	suspendLegalEstablishment: "corporate_administration.establishment.manage",
	closeLegalEstablishment: "corporate_administration.establishment.manage",
	setRegisteredAddress: "corporate_administration.establishment.manage",
	registerPremise: "corporate_administration.establishment.manage",
	endPremise: "corporate_administration.establishment.manage",
	createGovernanceBody: "corporate_administration.governance.manage",
	amendGovernanceBody: "corporate_administration.governance.manage",
	retireGovernanceBody: "corporate_administration.governance.manage",
	appointGovernanceMember: "corporate_administration.governance.manage",
	changeGovernanceMembership: "corporate_administration.governance.manage",
	endGovernanceMembership: "corporate_administration.governance.manage",
	defineStatutoryOffice: "corporate_administration.officer.manage",
	appointOfficer: "corporate_administration.officer.manage",
	amendOfficerAppointment: "corporate_administration.officer.manage",
	recordOfficerQualification: "corporate_administration.officer.manage",
	resignOfficer: "corporate_administration.officer.manage",
	removeOfficer: "corporate_administration.officer.manage",
	recordOfficerDeclaration:
		"corporate_administration.officer_compliance.manage",
	supersedeOfficerDeclaration:
		"corporate_administration.officer_compliance.manage",
	recordOfficerDisqualification:
		"corporate_administration.officer_compliance.manage",
	endOfficerDisqualification:
		"corporate_administration.officer_compliance.manage",
	discloseConflict: "corporate_administration.officer_compliance.manage",
	recordRecusal: "corporate_administration.officer_compliance.manage",
	scheduleGovernanceMeeting: "corporate_administration.meeting.manage",
	issueMeetingNotice: "corporate_administration.meeting.manage",
	recordNoticeDelivery: "corporate_administration.meeting.manage",
	waiveNotice: "corporate_administration.meeting.manage",
	recordMeetingParticipant: "corporate_administration.meeting.manage",
	openMeeting: "corporate_administration.meeting.manage",
	recordQuorum: "corporate_administration.meeting.manage",
	adjournMeeting: "corporate_administration.meeting.manage",
	closeMeeting: "corporate_administration.meeting.manage",
	recordMeetingVote: "corporate_administration.resolution.manage",
	adoptResolution: "corporate_administration.resolution.manage",
	rejectResolution: "corporate_administration.resolution.manage",
	recordWrittenResolution: "corporate_administration.resolution.manage",
	supersedeResolution: "corporate_administration.resolution.manage",
	assignResolutionAction: "corporate_administration.resolution.manage",
	completeResolutionAction: "corporate_administration.resolution.manage",
	recordMinutesDocument: "corporate_administration.resolution.manage",
} as const satisfies Readonly<
	Record<CorporateAdministrationCommandId, CorporateAdministrationPermission>
>;

export const CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS = {
	getLegalCompany: "corporate_administration.company.read",
	listLegalCompanies: "corporate_administration.company.read",
	listCompanyNames: "corporate_administration.company.read",
	findCompanyNameAsOf: "corporate_administration.company.read",
	findCompanyJurisdictionProfileAsOf: "corporate_administration.company.read",
	findCompanyLegalFormAsOf: "corporate_administration.company.read",
	listCompanyIdentifiers: "corporate_administration.company.read",
	findCompanyIdentifierAsOf: "corporate_administration.company.read",
	findCompanyFinancialYearAsOf: "corporate_administration.company.read",
	listCompanyActivitiesAsOf: "corporate_administration.company.read",
	findCompanyStatusAsOf: "corporate_administration.company.read",
	listCompaniesByStatus: "corporate_administration.company.read",
	getCompanyCompletenessForActivation: "corporate_administration.company.read",
	getLegalCompanyTimeline: "corporate_administration.company.read",
	getLegalEstablishment: "corporate_administration.company.read",
	listLegalEstablishmentsAsOf: "corporate_administration.company.read",
	findRegisteredAddressAsOf: "corporate_administration.company.read",
	listPremisesAsOf: "corporate_administration.company.read",
	getGovernanceBody: "corporate_administration.governance.read",
	listGovernanceBodiesAsOf: "corporate_administration.governance.read",
	listGovernanceMembershipsAsOf: "corporate_administration.governance.read",
	listRequiredStatutoryOffices: "corporate_administration.officer.read",
	listOfficersAsOf: "corporate_administration.officer.read",
	getOfficerAppointment: "corporate_administration.officer.read",
	getOfficerVacancyStatus: "corporate_administration.officer.read",
	getOfficerEligibilityAsOf: "corporate_administration.officer_compliance.read",
	listExpiringDeclarations: "corporate_administration.officer_compliance.read",
	listActiveDisqualifications:
		"corporate_administration.officer_compliance.read",
	listConflictsForMatter: "corporate_administration.officer_compliance.read",
	getGovernanceMeeting: "corporate_administration.meeting.read",
	listGovernanceMeetings: "corporate_administration.meeting.read",
	getMeetingAttendance: "corporate_administration.meeting.read",
	getMeetingQuorumStatus: "corporate_administration.meeting.read",
	getResolution: "corporate_administration.resolution.read",
	listResolutionsAsOf: "corporate_administration.resolution.read",
	getResolutionExecutionStatus: "corporate_administration.resolution.read",
	listOverdueResolutionActions: "corporate_administration.resolution.read",
} as const satisfies Readonly<
	Record<CorporateAdministrationQueryId, CorporateAdministrationPermission>
>;

/**
 * Fail-closed permission guard.
 *
 * Production callers must supply authorization through
 * `CorporateAdministrationExecutionContext`. The `| undefined` parameter is a
 * defensive utility only: missing wiring returns `FORBIDDEN` and never grants
 * access. Provider exceptions propagate as infrastructure failures; this
 * function does not catch them or translate them into domain results.
 *
 * Returns `Result<void>`. Denial metadata carries the requested permission
 * code only — never resource existence, submitted values, or provider internals.
 */
export async function requireCorporateAdministrationPermission(
	authorization: CorporateAdministrationAuthorizationContext | undefined,
	input: CorporateAdministrationAuthorizationInput,
): Promise<Result<void>> {
	if (authorization === undefined) {
		return forbidden(input.permission);
	}

	const permitted = await authorization.can(input);

	if (!permitted) {
		return forbidden(input.permission);
	}

	return errorResult.ok(undefined);
}

export async function requireCorporateAdministrationApprovalIfConfigured(
	dependencies: CorporateAdministrationApprovalVerificationDependencies,
	input: Readonly<{
		organizationId: OrganizationId;
		actorUserId: UserId;
		approvalRequestId?: ApprovalRequestId | undefined;
		approvalDecisionId?: ApprovalDecisionId | undefined;
		commandFingerprint: CommandFingerprint;
	}>,
): Promise<Result<void>> {
	if (dependencies.approvalDecisions === undefined) {
		return errorResult.ok(undefined);
	}
	if (
		input.approvalRequestId === undefined ||
		input.approvalDecisionId === undefined
	) {
		return errorResult.fail("FORBIDDEN");
	}
	const decision = await dependencies.approvalDecisions.verify({
		organizationId: input.organizationId,
		approvalRequestId: input.approvalRequestId,
		approvalDecisionId: input.approvalDecisionId,
		commandFingerprint: input.commandFingerprint,
	});
	if (!decision.ok) {
		return decision;
	}
	if (
		decision.data === null ||
		decision.data.organizationId !== input.organizationId ||
		decision.data.approvalRequestId !== input.approvalRequestId ||
		decision.data.approvalDecisionId !== input.approvalDecisionId ||
		decision.data.commandFingerprint !== input.commandFingerprint ||
		!decision.data.approved
	) {
		return errorResult.fail("FORBIDDEN");
	}
	if (decision.data.approverUserId === input.actorUserId) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
}

function forbidden(
	_permission: CorporateAdministrationPermission,
): Result<void> {
	return errorResult.fail("FORBIDDEN");
}
