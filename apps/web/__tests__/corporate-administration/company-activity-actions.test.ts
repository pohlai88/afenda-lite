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
	createCorrelationId: () => "corr-ca-activity-action-test",
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
	endCompanyActivityAction,
	registerCompanyActivityAction,
} from "../../app/actions/legal-company-identity-actions";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration company activity actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationCompanyDependencies.mockReturnValue(
			{ store: "ca-store", activityStore: "ca-activity-store" },
		);
	});

	it("rejects browser-controlled organization IDs", async () => {
		const result = await registerCompanyActivityAction(
			formData({
				organizationSlug: "afenda",
				organizationId: "org-forged",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				activityCode: "software_services",
				classification: "regulated",
				jurisdictionCode: "MY",
				regulatorCode: "MCMC",
				description: "Regulated software services",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-activity-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-activity-forged",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
		);
		expect(
			corporateAdministrationMocks.registerCompanyActivity,
		).not.toHaveBeenCalled();
	});

	it("stamps session facts and registers a regulated activity", async () => {
		corporateAdministrationMocks.registerCompanyActivity.mockResolvedValue({
			ok: true,
			data: {
				id: "99999999-9999-4999-8999-999999999999",
				version: 2,
			},
		});

		const result = await registerCompanyActivityAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				activityCode: "software_services",
				classification: "regulated",
				jurisdictionCode: "my",
				regulatorCode: "mcmc",
				description: "Regulated software services",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-activity-2",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-activity-register",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyActivityId: "99999999-9999-4999-8999-999999999999",
				version: 2,
			},
		});
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-activity-action-test",
			idempotencyKey: "idem-activity-register",
		});
		expect(
			corporateAdministrationMocks.registerCompanyActivity,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				activityCode: "software_services",
				classification: "regulated",
				jurisdictionCode: "MY",
				regulatorCode: "mcmc",
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			expect.objectContaining({ activityStore: "ca-activity-store" }),
		);
	});

	it("maps activity conflict without route revalidation", async () => {
		corporateAdministrationMocks.registerCompanyActivity.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message:
				"Corporate Administration activity overlaps an existing activity.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});

		const result = await registerCompanyActivityAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				activityCode: "software_services",
				classification: "operational",
				jurisdictionCode: "MY",
				description: "Software services",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-activity-3",
				expectedCompanyVersion: "2",
				idempotencyKey: "idem-activity-conflict",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "CONFLICT",
			message:
				"Corporate Administration activity overlaps an existing activity.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("end-dates an activity through the same tenant-scoped action context", async () => {
		corporateAdministrationMocks.endCompanyActivity.mockResolvedValue({
			ok: true,
			data: {
				id: "99999999-9999-4999-8999-999999999999",
				version: 3,
			},
		});

		const result = await endCompanyActivityAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyActivityId: "99999999-9999-4999-8999-999999999999",
				endedAt: "2027-01-01",
				endReason: "Activity no longer conducted.",
				expectedActivityVersion: "2",
				idempotencyKey: "idem-activity-end",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyActivityId: "99999999-9999-4999-8999-999999999999",
				version: 3,
			},
		});
		expect(
			corporateAdministrationMocks.endCompanyActivity,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				companyActivityId: "99999999-9999-4999-8999-999999999999",
				expectedActivityVersion: 2,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			expect.any(Object),
		);
	});
});
