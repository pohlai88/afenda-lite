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
	retireCompanyName: vi.fn(),
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
	authServer: { session: { get: authMocks.getSession, requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-name-action-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	addCompanyName: corporateAdministrationMocks.addCompanyName,
	retireCompanyName: corporateAdministrationMocks.retireCompanyName,
	supersedeCompanyName: corporateAdministrationMocks.supersedeCompanyName,
	setCompanyLegalForm: vi.fn(),
	supersedeCompanyLegalForm: vi.fn(),
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
	addCompanyNameAction,
	retireCompanyNameAction,
	supersedeCompanyNameAction,
} from "../../app/actions/legal-company-identity-actions";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration company-name actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationCompanyDependencies.mockReturnValue(
			{ store: "ca-store", nameStore: "ca-name-store" },
		);
	});

	it("stamps session facts and rejects browser organization IDs", async () => {
		const forged = await addCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				organizationId: "org-forged",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				nameType: "translated",
				languageCode: "zh",
				displayName: "阿芬达马来西亚",
				effectiveFrom: "2026-01-01",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-name-forged",
			}),
		);

		expect(forged).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR", ok: false }),
		);
		expect(corporateAdministrationMocks.addCompanyName).not.toHaveBeenCalled();

		corporateAdministrationMocks.addCompanyName.mockResolvedValue({
			ok: true,
			data: {
				id: "33333333-3333-4333-8333-333333333333",
				version: 2,
			},
		});

		const result = await addCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				nameType: "translated",
				languageCode: "zh",
				displayName: "阿芬达马来西亚",
				effectiveFrom: "2026-01-01",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-name-add",
			}),
		);

		expect(result.ok).toBe(true);
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-name-action-test",
			idempotencyKey: "idem-name-add",
		});
		expect(corporateAdministrationMocks.addCompanyName).toHaveBeenCalledWith(
			expect.objectContaining({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				nameType: "translated",
				languageCode: "zh",
				displayName: "阿芬达马来西亚",
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			expect.objectContaining({ nameStore: "ca-name-store" }),
		);
	});

	it("maps stale and overlap feedback without route revalidation", async () => {
		corporateAdministrationMocks.supersedeCompanyName.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message: "Corporate Administration company-name version is stale.",
			details: { reason: "CORPORATE_ADMINISTRATION_STALE_VERSION" },
		});

		const result = await supersedeCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyNameId: "33333333-3333-4333-8333-333333333333",
				expectedNameVersion: "2",
				"replacement.nameType": "legal",
				"replacement.languageCode": "en",
				"replacement.displayName": "Afenda Holdings Sdn Bhd",
				"replacement.effectiveFrom": "2027-01-01",
				"replacement.sourceDocumentId": "doc-name-1",
				"replacement.correctionReason": "Board-approved rename.",
				idempotencyKey: "idem-name-supersede",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "CONFLICT",
			message: "Corporate Administration company-name version is stale.",
			details: { reason: "CORPORATE_ADMINISTRATION_STALE_VERSION" },
		});
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("retires a company name through the same tenant-scoped action context", async () => {
		corporateAdministrationMocks.retireCompanyName.mockResolvedValue({
			ok: true,
			data: {
				id: "33333333-3333-4333-8333-333333333333",
				version: 3,
			},
		});

		const result = await retireCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyNameId: "33333333-3333-4333-8333-333333333333",
				retiredAt: "2027-03-01T00:00:00.000Z",
				retirementReason: "Trading name no longer used.",
				expectedNameVersion: "2",
				idempotencyKey: "idem-name-retire",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyNameId: "33333333-3333-4333-8333-333333333333",
				version: 3,
			},
		});
		expect(corporateAdministrationMocks.retireCompanyName).toHaveBeenCalledWith(
			expect.objectContaining({
				companyNameId: "33333333-3333-4333-8333-333333333333",
				expectedNameVersion: 2,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			expect.any(Object),
		);
	});
});
