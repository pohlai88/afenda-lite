import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationAuthorizationContext,
	CorporateAdministrationAuthorizationInput,
	CorporateAdministrationCommandOptions,
	CorporateAdministrationExecutionContext,
	CorporateAdministrationPaginatedQueryOptions,
	CorporateAdministrationQueryOptions,
} from "@afenda/corporate-administration";
import {
	CORPORATE_ADMINISTRATION_ERROR_CODES,
	CORPORATE_ADMINISTRATION_PERMISSION_CODES,
	CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON,
	corporateAdministrationErrorCodeSchema,
	corporateAdministrationErrorDetails,
	corporateAdministrationFailureDetailsSchema,
	corporateAdministrationFailureMetadataSchema,
	corporateAdministrationResultCode,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import type { CanonicalErrorCode } from "@afenda/errors";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { requireCorporateAdministrationPermission } from "../src/kernel/authorization/authorization";
import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
} from "../src/kernel/operations/registry";

describe("Corporate Administration authorization and boundary contracts", () => {
	const input: CorporateAdministrationAuthorizationInput = {
		organizationId: organizationIdSchema.parse("org_1"),
		actorUserId: userIdSchema.parse("user_1"),
		permission:
			"corporate_administration.synthetic" as CorporateAdministrationAuthorizationInput["permission"],
	};
	it("denies access when authorization is unavailable", async () => {
		const result = await requireCorporateAdministrationPermission(
			undefined,
			input,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
			expect(result.message).toBe("The operation is not permitted");
		}
	});
	it("denies access when permission is rejected", async () => {
		const authorization: CorporateAdministrationAuthorizationContext = {
			can: vi.fn().mockResolvedValue(false),
		};
		const result = await requireCorporateAdministrationPermission(
			authorization,
			input,
		);
		expect(result.ok).toBe(false);
		expect(authorization.can).toHaveBeenCalledWith(input);
	});
	it("does not treat module_admin as an implicit bypass", async () => {
		const authorization: CorporateAdministrationAuthorizationContext = {
			can: vi.fn().mockResolvedValue(false),
		};
		const moduleAdminInput = {
			...input,
			permission:
				"corporate_administration.module_admin" as CorporateAdministrationAuthorizationInput["permission"],
		};
		const result = await requireCorporateAdministrationPermission(
			authorization,
			moduleAdminInput,
		);
		expect(result.ok).toBe(false);
		expect(authorization.can).toHaveBeenCalledWith(moduleAdminInput);
	});
	it("allows an explicitly authorized tenant capability", async () => {
		const authorization: CorporateAdministrationAuthorizationContext = {
			can: vi.fn().mockResolvedValue(true),
		};
		const result = await requireCorporateAdministrationPermission(
			authorization,
			input,
		);
		expect(result).toEqual({
			ok: true,
			data: undefined,
		});
		expect(authorization.can).toHaveBeenCalledWith(input);
	});
	it("does not hide authorization-provider failures", async () => {
		const failure = new Error("Authorization provider unavailable");
		const authorization: CorporateAdministrationAuthorizationContext = {
			can: vi.fn().mockRejectedValue(failure),
		};
		await expect(
			requireCorporateAdministrationPermission(authorization, input),
		).rejects.toBe(failure);
	});
	it("keeps command and query execution context contracts consistent", () => {
		expectTypeOf<CorporateAdministrationCommandOptions>().toExtend<CorporateAdministrationExecutionContext>();
		expectTypeOf<CorporateAdministrationQueryOptions>().toEqualTypeOf<CorporateAdministrationExecutionContext>();
		expectTypeOf<CorporateAdministrationExecutionContext>().toHaveProperty(
			"authorization",
		);
		expectTypeOf<
			CorporateAdministrationExecutionContext["authorization"]
		>().not.toEqualTypeOf<
			CorporateAdministrationAuthorizationContext | undefined
		>();
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"clock",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"requestInstant",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"approvalRequestId",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"approvalDecisionId",
		);
		expectTypeOf<CorporateAdministrationApprovalCommandOptions>().toExtend<CorporateAdministrationCommandOptions>();
		expectTypeOf<CorporateAdministrationApprovalCommandOptions>().toHaveProperty(
			"approvalRequestId",
		);
		expectTypeOf<CorporateAdministrationApprovalCommandOptions>().toHaveProperty(
			"approvalDecisionId",
		);
		expectTypeOf<CorporateAdministrationPaginatedQueryOptions>().toExtend<CorporateAdministrationQueryOptions>();
		expectTypeOf<CorporateAdministrationQueryOptions>().not.toHaveProperty(
			"clock",
		);
	});
	it("returns identical FORBIDDEN shape for missing wiring and explicit denial", async () => {
		const denied: CorporateAdministrationAuthorizationContext = {
			can: vi.fn().mockResolvedValue(false),
		};
		const missing = await requireCorporateAdministrationPermission(
			undefined,
			input,
		);
		const rejected = await requireCorporateAdministrationPermission(
			denied,
			input,
		);
		expect(missing.ok).toBe(false);
		expect(rejected.ok).toBe(false);
		if (!(missing.ok || rejected.ok)) {
			expect(missing).toEqual(rejected);
		}
	});
	it("maps CA-1.4 company and establishment IDs to permissions", () => {
		expect(CORPORATE_ADMINISTRATION_PERMISSION_CODES).toEqual([
			"corporate_administration.company.read",
			"corporate_administration.company.manage",
			"corporate_administration.establishment.manage",
			"corporate_administration.governance.read",
			"corporate_administration.governance.manage",
			"corporate_administration.officer.read",
			"corporate_administration.officer.manage",
			"corporate_administration.officer_compliance.read",
			"corporate_administration.officer_compliance.manage",
			"corporate_administration.meeting.read",
			"corporate_administration.meeting.manage",
			"corporate_administration.resolution.read",
			"corporate_administration.resolution.manage",
			"corporate_administration.authority.read",
			"corporate_administration.authority.manage",
		]);
		expect(CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS).toEqual({
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
			registerLegalEstablishment:
				"corporate_administration.establishment.manage",
			updateLegalEstablishment: "corporate_administration.establishment.manage",
			activateLegalEstablishment:
				"corporate_administration.establishment.manage",
			suspendLegalEstablishment:
				"corporate_administration.establishment.manage",
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
			grantAuthorityMandate: "corporate_administration.authority.manage",
			amendAuthorityMandate: "corporate_administration.authority.manage",
			revokeAuthorityMandate: "corporate_administration.authority.manage",
		});
		expect(CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS).toEqual({
			getLegalCompany: "corporate_administration.company.read",
			listLegalCompanies: "corporate_administration.company.read",
			listCompanyNames: "corporate_administration.company.read",
			findCompanyNameAsOf: "corporate_administration.company.read",
			findCompanyJurisdictionProfileAsOf:
				"corporate_administration.company.read",
			findCompanyLegalFormAsOf: "corporate_administration.company.read",
			listCompanyIdentifiers: "corporate_administration.company.read",
			findCompanyIdentifierAsOf: "corporate_administration.company.read",
			findCompanyFinancialYearAsOf: "corporate_administration.company.read",
			listCompanyActivitiesAsOf: "corporate_administration.company.read",
			findCompanyStatusAsOf: "corporate_administration.company.read",
			listCompaniesByStatus: "corporate_administration.company.read",
			getCompanyCompletenessForActivation:
				"corporate_administration.company.read",
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
			getOfficerEligibilityAsOf:
				"corporate_administration.officer_compliance.read",
			listExpiringDeclarations:
				"corporate_administration.officer_compliance.read",
			listActiveDisqualifications:
				"corporate_administration.officer_compliance.read",
			listConflictsForMatter:
				"corporate_administration.officer_compliance.read",
			getGovernanceMeeting: "corporate_administration.meeting.read",
			listGovernanceMeetings: "corporate_administration.meeting.read",
			getMeetingAttendance: "corporate_administration.meeting.read",
			getMeetingQuorumStatus: "corporate_administration.meeting.read",
			getResolution: "corporate_administration.resolution.read",
			listResolutionsAsOf: "corporate_administration.resolution.read",
			getResolutionExecutionStatus: "corporate_administration.resolution.read",
			listOverdueResolutionActions: "corporate_administration.resolution.read",
			listAuthorityMandatesAsOf: "corporate_administration.authority.read",
			getAuthorityMandate: "corporate_administration.authority.read",
		});
	});
	it("rejects unsafe semantic error metadata", () => {
		expect(() =>
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
				{ field: "stack trace\nSELECT *" },
			),
		).toThrow();
	});
	it("accepts only strict non-sensitive failure metadata", () => {
		const metadata = corporateAdministrationFailureMetadataSchema.parse({
			field: "normalizedCode",
			entityType: "test_entity",
			permission: "test.permission",
			expectedVersion: 1,
			actualVersion: 2,
			correlationId: "correlation-123",
		});
		expect(metadata).toEqual({
			field: "normalizedCode",
			entityType: "test_entity",
			permission: "test.permission",
			expectedVersion: 1,
			actualVersion: 2,
			correlationId: "correlation-123",
		});
		expect(Object.isFrozen(metadata)).toBe(true);
		for (const key of [
			"name",
			"registrationNumber",
			"identityValue",
			"documentUrl",
			"submittedValue",
			"secretData",
		]) {
			expect(() =>
				corporateAdministrationFailureMetadataSchema.parse({ [key]: "value" }),
			).toThrow();
		}
		expect(() =>
			corporateAdministrationFailureMetadataSchema.parse({
				field: "https://example.test/document",
			}),
		).toThrow();
	});
	it("maps every domain error reason to a result code", () => {
		expect(
			Object.keys(CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON).sort(),
		).toEqual([...CORPORATE_ADMINISTRATION_ERROR_CODES].sort());
		expect(
			corporateAdministrationErrorCodeSchema.safeParse(
				"CORPORATE_ADMINISTRATION_UNKNOWN",
			).success,
		).toBe(false);
		for (const reason of CORPORATE_ADMINISTRATION_ERROR_CODES) {
			const resultCode: CanonicalErrorCode =
				corporateAdministrationResultCode(reason);
			expect(resultCode).toBeDefined();
			expect(corporateAdministrationErrorCodeSchema.parse(reason)).toBe(reason);
		}
	});
	it("constructs validated corporate administration failure details", () => {
		expect(
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_STALE_VERSION",
				{
					entityType: "test_entity",
					expectedVersion: 3,
					actualVersion: 4,
					correlationId: "correlation-123",
				},
			),
		).toEqual({
			reason: "CORPORATE_ADMINISTRATION_STALE_VERSION",
			entityType: "test_entity",
			expectedVersion: 3,
			actualVersion: 4,
			correlationId: "correlation-123",
		});
	});
	it("rejects unknown or unsafe corporate administration failure details", () => {
		expect(() =>
			corporateAdministrationFailureDetailsSchema.parse({
				reason: "CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
				secretValue: "must-not-leak",
			}),
		).toThrow();
		expect(() =>
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
				{
					entityType: "<script>",
				},
			),
		).toThrow();
	});
});
