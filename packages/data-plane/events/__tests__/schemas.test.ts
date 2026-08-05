import { describe, expect, it } from "vitest";

import {
	AllEventSchemas,
	corporateAdministrationLegalCompanyActivityEndedPayloadSchema,
	corporateAdministrationLegalCompanyActivityRegisteredPayloadSchema,
	corporateAdministrationLegalCompanyFinancialYearSetPayloadSchema,
	corporateAdministrationLegalCompanyIdentifierRegisteredPayloadSchema,
	corporateAdministrationLegalCompanyIdentifierRetiredPayloadSchema,
	corporateAdministrationLegalCompanyJurisdictionProfileSetPayloadSchema,
	corporateAdministrationLegalCompanyLegalFormChangedPayloadSchema,
	corporateAdministrationLegalCompanyNameAddedPayloadSchema,
	corporateAdministrationLegalCompanyNameRetiredPayloadSchema,
	corporateAdministrationLegalCompanyNameSupersededPayloadSchema,
	corporateAdministrationLegalCompanyProfileUpdatedPayloadSchema,
	corporateAdministrationLegalEstablishmentRegisteredPayloadSchema,
	corporateAdministrationRegisteredAddressSetPayloadSchema,
	isKnownEventType,
	publishEventCommandSchema,
} from "../src/schemas";
import { EVENT_SOURCE_MODULES } from "../src/types";

describe("@afenda/events schemas", () => {
	it("registers living catalog types only", () => {
		const livingTypes = Object.keys(AllEventSchemas).toSorted();

		expect(new Set(livingTypes).size).toBe(livingTypes.length);
		expect(livingTypes).toHaveLength(384);
		expect(livingTypes).toEqual([...livingTypes].toSorted());
		expect(livingTypes).toEqual(
			expect.arrayContaining([
				"accounting.journal.posted.v1",
				"corporate_administration.governance_body.created.v1",
				"corporate_administration.governance_meeting.scheduled.v1",
				"corporate_administration.legal_company.draft_registered.v1",
				"corporate_administration.legal_company.activity_ended.v1",
				"corporate_administration.legal_company.identifier_retired.v1",
				"corporate_administration.legal_company.name_retired.v1",
				"corporate_administration.officer.appointed.v1",
				"corporate_administration.resolution.adopted.v1",
				"fulfillment.delivery.created.v1",
				"human-resources.employee.created.v1",
				"identity.org_role.assigned",
				"inventory.movement.created.v1",
				"master_data.party.created.v1",
				"master_data.payment_term.created.v1",
				"payables.invoice.matched.v1",
				"payments.payment.reversed.v1",
				"payroll.final-settlement.finalized.v1",
				"purchasing.order.created.v1",
				"receivables.invoice.created.v1",
				"receiving.receipt.created.v1",
				"sales.order.approved.v1",
				"sales.order.created.v1",
				"sales.order.created_from_quotation.v1",
				"sales.price_book.created.v1",
				"sales.quotation.created.v1",
				"sales.return.created.v1",
			]),
		);

		expect(isKnownEventType("identity.org_role.assigned")).toBe(true);
		expect(isKnownEventType("accounting.journal.posted.v1")).toBe(true);
		expect(isKnownEventType("master_data.party.created.v1")).toBe(true);
		expect(isKnownEventType("master_data.payment_term.created.v1")).toBe(true);
		expect(isKnownEventType("payables.invoice.matched.v1")).toBe(true);
		expect(isKnownEventType("payments.payment.reversed.v1")).toBe(true);
		expect(isKnownEventType("purchasing.order.created.v1")).toBe(true);
		expect(isKnownEventType("inventory.movement.created.v1")).toBe(true);
		expect(isKnownEventType("receiving.receipt.created.v1")).toBe(true);
		expect(isKnownEventType("fulfillment.delivery.created.v1")).toBe(true);
		expect(isKnownEventType("receivables.invoice.created.v1")).toBe(true);
		expect(isKnownEventType("sales.order.created.v1")).toBe(true);
		expect(isKnownEventType("sales.quotation.created.v1")).toBe(true);
		expect(
			isKnownEventType("corporate_administration.officer.appointed.v1"),
		).toBe(true);
		expect(isKnownEventType("crm.deal.won")).toBe(false);
	});

	it("registers CA-1.4 establishment events with redacted statutory address facts", () => {
		const common = {
			organizationId: "org-ca-1-4",
			legalCompanyId: "00000000-0000-4000-8000-000000000141",
			occurredAt: "2026-01-01T00:00:00.000Z",
			actorUserId: "user-ca-1-4",
			correlationId: "corr-ca-1-4",
		};
		expect(
			corporateAdministrationLegalEstablishmentRegisteredPayloadSchema.safeParse(
				{
					...common,
					legalEstablishmentId: "00000000-0000-4000-8000-000000000142",
					establishmentType: "branch",
					jurisdictionCode: "MY",
					registeredFrom: "2026-01-01",
				},
			),
		).toEqual(expect.objectContaining({ success: true }));

		const addressEvent = {
			...common,
			registeredAddressId: "00000000-0000-4000-8000-000000000143",
			legalEstablishmentId: null,
			addressType: "registered_office",
			countryCode: "MY",
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
		};
		expect(
			corporateAdministrationRegisteredAddressSetPayloadSchema.safeParse(
				addressEvent,
			),
		).toEqual(expect.objectContaining({ success: true }));
		expect(
			corporateAdministrationRegisteredAddressSetPayloadSchema.safeParse({
				...addressEvent,
				line1: "1 Confidential Way",
				sourceDocumentId: "secret-document",
			}).success,
		).toBe(false);
	});

	it("registers payables as an event source module", () => {
		expect(EVENT_SOURCE_MODULES).toContain("payables");
	});

	it("registers payments as an event source module", () => {
		expect(EVENT_SOURCE_MODULES).toContain("payments");
	});

	it("registers accounting as an event source module", () => {
		expect(EVENT_SOURCE_MODULES).toContain("accounting");
	});

	it("registers human-resources as an event source module", () => {
		expect(EVENT_SOURCE_MODULES).toContain("human-resources");
	});

	it("registers payroll as an event source module", () => {
		expect(EVENT_SOURCE_MODULES).toContain("payroll");
	});

	it("accepts Corporate Administration legal company profile update events", () => {
		const payload = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			profileVersion: 2,
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
			changedPaths: ["profile"],
		};

		expect(
			corporateAdministrationLegalCompanyProfileUpdatedPayloadSchema.safeParse(
				payload,
			).success,
		).toBe(true);
		expect(
			publishEventCommandSchema.safeParse({
				type: "corporate_administration.legal_company.profile_updated.v1",
				sourceModule: "corporate-administration",
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
				payload,
			}).success,
		).toBe(true);
	});

	it("accepts redacted Corporate Administration jurisdiction profile events", () => {
		const payload = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			profileVersion: 1,
			jurisdictionProfileId: "profile-1",
			jurisdictionCode: "MY",
			entityTypeCode: "private_limited",
			effectiveFrom: "2026-07-26",
			effectiveTo: null,
			supersedesId: null,
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
		};

		expect(
			corporateAdministrationLegalCompanyJurisdictionProfileSetPayloadSchema.safeParse(
				payload,
			).success,
		).toBe(true);
		expect(
			publishEventCommandSchema.safeParse({
				type: "corporate_administration.legal_company.jurisdiction_profile_set.v1",
				sourceModule: "corporate-administration",
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
				payload,
			}).success,
		).toBe(true);
	});

	it("rejects sensitive Corporate Administration event payload fields", () => {
		const parsed =
			corporateAdministrationLegalCompanyJurisdictionProfileSetPayloadSchema.safeParse(
				{
					organizationId: "org-1",
					legalCompanyId: "company-1",
					profileVersion: 1,
					jurisdictionProfileId: "profile-1",
					jurisdictionCode: "MY",
					entityTypeCode: "private_limited",
					effectiveFrom: "2026-07-26",
					effectiveTo: null,
					supersedesId: null,
					occurredAt: "2026-07-26T10:15:30.000Z",
					actorUserId: "user-1",
					correlationId: "corr-1",
					sourceDocumentUrl: "https://example.test/private.pdf",
				},
			);

		expect(parsed.success).toBe(false);
	});

	it("accepts redacted Corporate Administration company-name events", () => {
		const addedPayload = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			companyNameId: "name-1",
			nameType: "legal",
			languageCode: "en",
			effectiveFrom: "2026-07-26",
			effectiveTo: null,
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
		};
		const supersededPayload = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			predecessorCompanyNameId: "name-1",
			successorCompanyNameId: "name-2",
			nameType: "legal",
			languageCode: "en",
			effectiveFrom: "2027-01-01",
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
		};

		expect(
			corporateAdministrationLegalCompanyNameAddedPayloadSchema.safeParse(
				addedPayload,
			).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyNameSupersededPayloadSchema.safeParse(
				supersededPayload,
			).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyNameSupersededPayloadSchema.safeParse({
				...supersededPayload,
				supersedesId: "name-1",
			}).success,
		).toBe(false);
	});

	it("accepts redacted Corporate Administration legal-form events", () => {
		const payload = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			legalFormHistoryId: "legal-form-1",
			previousLegalFormCode: "private_limited",
			legalFormCode: "public_limited",
			jurisdictionCode: "MY",
			effectiveFrom: "2027-01-01",
			effectiveTo: null,
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
		};

		expect(
			corporateAdministrationLegalCompanyLegalFormChangedPayloadSchema.safeParse(
				payload,
			).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyLegalFormChangedPayloadSchema.safeParse(
				{
					...payload,
					companyLegalFormHistoryId: "legal-form-1",
					sourceDocumentUrl: "https://example.test/private.pdf",
					rawPartyRecord: { id: "party-1" },
				},
			).success,
		).toBe(false);
	});

	it("accepts redacted Corporate Administration identifier, financial-year and activity events", () => {
		const identifierPayload = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			companyIdentifierId: "identifier-1",
			identifierType: "company_registration",
			jurisdictionCode: "MY",
			authorityCode: "SSM",
			lastFour: "4567",
			identifierDigest:
				"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			effectiveFrom: "2026-07-26",
			effectiveTo: null,
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
		};
		const financialYearPayload = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			companyFinancialYearId: "financial-year-1",
			yearEndMonth: 12,
			yearEndDay: 31,
			functionalCurrencyCode: "MYR",
			effectiveFrom: "2026-01-01",
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
		};
		const activityPayload = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			companyActivityId: "activity-1",
			activityType: "regulated",
			classificationSystem: "MSIC",
			activityCode: "64999",
			jurisdictionCode: "MY",
			effectiveFrom: "2026-01-01",
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
		};

		expect(
			corporateAdministrationLegalCompanyIdentifierRegisteredPayloadSchema.safeParse(
				identifierPayload,
			).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyIdentifierRegisteredPayloadSchema.safeParse(
				{
					...identifierPayload,
					identifierValue: "2026-01234567",
					normalizedIdentifierValue: "202601234567",
					sourceDocumentUrl: "https://example.test/private.pdf",
				},
			).success,
		).toBe(false);
		expect(
			corporateAdministrationLegalCompanyFinancialYearSetPayloadSchema.safeParse(
				financialYearPayload,
			).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyFinancialYearSetPayloadSchema.safeParse(
				{
					...financialYearPayload,
					fiscalYearStartMonth: 1,
					reportingCurrencyCode: "MYR",
				},
			).success,
		).toBe(false);
		expect(
			corporateAdministrationLegalCompanyActivityRegisteredPayloadSchema.safeParse(
				activityPayload,
			).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyActivityRegisteredPayloadSchema.safeParse(
				{
					...activityPayload,
					classification: "regulated",
					regulatorCode: "SC",
				},
			).success,
		).toBe(false);
	});

	it("accepts redacted Corporate Administration retirement and activity-end events", () => {
		const base = {
			organizationId: "org-1",
			legalCompanyId: "company-1",
			occurredAt: "2026-07-26T10:15:30.000Z",
			actorUserId: "user-1",
			correlationId: "corr-1",
		};

		expect(
			corporateAdministrationLegalCompanyNameRetiredPayloadSchema.safeParse({
				...base,
				companyNameId: "name-1",
				nameType: "trading",
				retiredAt: "2026-07-26T10:00:00.000Z",
			}).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyIdentifierRetiredPayloadSchema.safeParse(
				{
					...base,
					companyIdentifierId: "identifier-1",
					identifierType: "company_registration",
					jurisdictionCode: "MY",
					retiredAt: "2026-07-26T10:00:00.000Z",
				},
			).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyActivityEndedPayloadSchema.safeParse({
				...base,
				companyActivityId: "activity-1",
				activityType: "regulated",
				activityCode: "64999",
				jurisdictionCode: "MY",
				endedAt: "2026-07-26",
			}).success,
		).toBe(true);
		expect(
			corporateAdministrationLegalCompanyIdentifierRetiredPayloadSchema.safeParse(
				{
					...base,
					companyIdentifierId: "identifier-1",
					identifierType: "company_registration",
					jurisdictionCode: "MY",
					retiredAt: "2026-07-26T10:00:00.000Z",
					identifierValue: "2026-01234567",
				},
			).success,
		).toBe(false);
	});

	it("accepts a valid publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "identity.org_role.assigned",
			sourceModule: "identity",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				roleId: "role-1",
				assignmentId: "assign-1",
				recipientUserId: "user-2",
				reactivated: false,
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts a receivables publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "receivables.invoice.created.v1",
			sourceModule: "receivables",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				entityId: "00000000-0000-4000-8000-000000000001",
				customerId: "00000000-0000-4000-8000-000000000002",
				amount: "125.50",
				currencyCode: "USD",
				actorId: "user-1",
				correlationId: "corr-1",
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts a payables publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "payables.invoice.matched.v1",
			sourceModule: "payables",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				entityId: "00000000-0000-4000-8000-000000000001",
				supplierId: "00000000-0000-4000-8000-000000000002",
				amount: "125.50",
				currencyCode: "USD",
				actorId: "user-1",
				correlationId: "corr-1",
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts a payments publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "payments.payment.posted.v1",
			sourceModule: "payments",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				paymentId: "00000000-0000-4000-8000-000000000001",
				paymentAccountId: "00000000-0000-4000-8000-000000000002",
				paymentMethodId: "00000000-0000-4000-8000-000000000003",
				methodSnapshot: {
					paymentMethodId: "00000000-0000-4000-8000-000000000003",
					code: "bank-transfer",
					kind: "wire",
				},
				instrument: { kind: "bank-transfer", reference: "STMT-1" },
				fx: null,
				functionalAmount: "125.50",
				cashMovement: "123.50",
				deductions: [
					{
						kind: "bank_charge",
						effect: "reduces_cash_movement",
						accountingPurposeCode: "bank-fees",
						amount: "2",
						functionalAmount: "2",
					},
				],
				roundingDifferenceFunctionalAmount: null,
				direction: "receipt",
				purpose: "customer_receipt",
				status: "posted",
				amount: "125.50",
				currencyCode: "USD",
				transferGroupId: null,
				linkedPaymentId: null,
				originalPaymentId: null,
				actorId: "user-1",
				correlationId: "corr-1",
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts an accounting publish command", () => {
		const parsed = publishEventCommandSchema.safeParse({
			type: "accounting.period.closed.v1",
			sourceModule: "accounting",
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			payload: {
				organizationId: "org-1",
				entityId: "00000000-0000-4000-8000-000000000001",
				actorId: "user-1",
				correlationId: "corr-1",
			},
		});
		expect(parsed.success).toBe(true);
	});
});
