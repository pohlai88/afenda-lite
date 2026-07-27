import { beforeEach, describe, expect, it, vi } from "vitest";

const memberSession = {
	userId: "user-ca-member",
	orgId: "org-ca-active",
	role: "member" as const,
	email: "member@example.com",
};

const authMocks = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const corporateAdministrationMocks = vi.hoisted(() => ({
	addCompanyName: vi.fn(),
	endCompanyActivity: vi.fn(),
	registerCompanyActivity: vi.fn(),
	registerCompanyIdentifier: vi.fn(),
	retireCompanyIdentifier: vi.fn(),
	retireCompanyName: vi.fn(),
	setCompanyFinancialYear: vi.fn(),
	setCompanyLegalForm: vi.fn(),
	supersedeCompanyIdentifier: vi.fn(),
	supersedeCompanyLegalForm: vi.fn(),
	supersedeCompanyName: vi.fn(),
}));

const compositionMocks = vi.hoisted(() => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationCompanyDependencies: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	getSession: authMocks.getSession,
	requireRole: vi.fn(),
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-ca-identifier-action-test",
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", () => ({
	addCompanyName: corporateAdministrationMocks.addCompanyName,
	endCompanyActivity: corporateAdministrationMocks.endCompanyActivity,
	registerCompanyActivity: corporateAdministrationMocks.registerCompanyActivity,
	registerCompanyIdentifier:
		corporateAdministrationMocks.registerCompanyIdentifier,
	retireCompanyIdentifier: corporateAdministrationMocks.retireCompanyIdentifier,
	retireCompanyName: corporateAdministrationMocks.retireCompanyName,
	setCompanyFinancialYear: corporateAdministrationMocks.setCompanyFinancialYear,
	setCompanyLegalForm: corporateAdministrationMocks.setCompanyLegalForm,
	supersedeCompanyIdentifier:
		corporateAdministrationMocks.supersedeCompanyIdentifier,
	supersedeCompanyLegalForm:
		corporateAdministrationMocks.supersedeCompanyLegalForm,
	supersedeCompanyName: corporateAdministrationMocks.supersedeCompanyName,
}));

vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions:
		compositionMocks.createCorporateAdministrationCommandOptions,
	createCorporateAdministrationCompanyDependencies:
		compositionMocks.createCorporateAdministrationCompanyDependencies,
}));

vi.mock("next/cache", () => ({
	revalidatePath: cacheMocks.revalidatePath,
}));

import {
	registerCompanyIdentifierAction,
	retireCompanyIdentifierAction,
	supersedeCompanyIdentifierAction,
} from "../../app/actions/legal-company-identity-actions";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration company-identifier actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationCompanyDependencies.mockReturnValue(
			{ store: "ca-store", identifierStore: "ca-identifier-store" },
		);
	});

	it("rejects browser tenant data and tax identifier types before package execution", async () => {
		const forged = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				organizationId: "org-forged",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-01234567",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-identifier-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-identifier-forged",
			}),
		);
		expect(forged).toEqual(
			expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
		);

		const tax = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				identifierType: "vat",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "LHDN",
				identifierValue: "VAT-123",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-identifier-2",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-identifier-tax",
			}),
		);
		expect(tax).toEqual(
			expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
		);
		expect(
			corporateAdministrationMocks.registerCompanyIdentifier,
		).not.toHaveBeenCalled();
	});

	it("stamps session facts and registers a non-tax identifier", async () => {
		corporateAdministrationMocks.registerCompanyIdentifier.mockResolvedValue({
			ok: true,
			data: {
				id: "77777777-7777-4777-8777-777777777777",
				version: 4,
			},
		});

		const result = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				identifierType: "company_registration",
				jurisdictionCode: "my",
				issuingAuthorityCode: "ssm",
				identifierValue: "2026-01234567",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-identifier-3",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-identifier-register",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyIdentifierId: "77777777-7777-4777-8777-777777777777",
				version: 4,
			},
		});
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-identifier-action-test",
			idempotencyKey: "idem-identifier-register",
		});
		expect(
			corporateAdministrationMocks.registerCompanyIdentifier,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-01234567",
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			expect.objectContaining({ identifierStore: "ca-identifier-store" }),
		);
	});

	it("maps duplicate identifier conflict without revalidating routes", async () => {
		corporateAdministrationMocks.supersedeCompanyIdentifier.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message: "Corporate Administration identifier overlaps an existing fact.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});

		const result = await supersedeCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyIdentifierId: "77777777-7777-4777-8777-777777777777",
				expectedIdentifierVersion: "4",
				"replacement.identifierType": "company_registration",
				"replacement.jurisdictionCode": "MY",
				"replacement.issuingAuthorityCode": "SSM",
				"replacement.identifierValue": "2026-01234567",
				"replacement.effectiveFrom": "2026-06-01",
				"replacement.sourceDocumentId": "doc-identifier-4",
				"replacement.correctionReason": "Registrar correction.",
				idempotencyKey: "idem-identifier-overlap",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "CONFLICT",
			message: "Corporate Administration identifier overlaps an existing fact.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("retires an identifier through the same tenant-scoped action context", async () => {
		corporateAdministrationMocks.retireCompanyIdentifier.mockResolvedValue({
			ok: true,
			data: {
				id: "77777777-7777-4777-8777-777777777777",
				version: 5,
			},
		});

		const result = await retireCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyIdentifierId: "77777777-7777-4777-8777-777777777777",
				retiredAt: "2027-01-01T00:00:00.000Z",
				retirementReason: "Registrar number retired.",
				expectedIdentifierVersion: "4",
				idempotencyKey: "idem-identifier-retire",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyIdentifierId: "77777777-7777-4777-8777-777777777777",
				version: 5,
			},
		});
		expect(
			corporateAdministrationMocks.retireCompanyIdentifier,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				companyIdentifierId: "77777777-7777-4777-8777-777777777777",
				expectedIdentifierVersion: 4,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			expect.any(Object),
		);
	});
});
