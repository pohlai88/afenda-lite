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
	grantAuthorityMandate: vi.fn(),
	amendAuthorityMandate: vi.fn(),
	revokeAuthorityMandate: vi.fn(),
}));

const compositionMocks = vi.hoisted(() => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationAuthorityDependencies: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: authMocks.getSession, requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-authority-action-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	grantAuthorityMandate: corporateAdministrationMocks.grantAuthorityMandate,
	amendAuthorityMandate: corporateAdministrationMocks.amendAuthorityMandate,
	revokeAuthorityMandate: corporateAdministrationMocks.revokeAuthorityMandate,
}));

vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions:
		compositionMocks.createCorporateAdministrationCommandOptions,
	createCorporateAdministrationAuthorityDependencies:
		compositionMocks.createCorporateAdministrationAuthorityDependencies,
}));

vi.mock("next/cache", () => ({
	revalidatePath: cacheMocks.revalidatePath,
}));

import {
	amendAuthorityMandateAction,
	grantAuthorityMandateAction,
	revokeAuthorityMandateAction,
} from "../../app/actions/corporate-administration-authority-actions";

const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const partyId = "22222222-2222-4222-8222-222222222222";
const mandateId = "44444444-4444-4444-8444-444444444444";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

function grantForm(overrides: Readonly<Record<string, string>> = {}) {
	return formData({
		organizationSlug: "afenda",
		legalCompanyId,
		mandateType: "signing_authority",
		holderPartyId: partyId,
		holderOfficerAppointmentId: "",
		grantedByType: "board_resolution",
		grantingResolutionId: "",
		scopeDescription: "Sign supplier contracts up to the approved limit",
		monetaryLimitAmount: "",
		monetaryLimitCurrencyCode: "",
		jurisdictionCode: "",
		protectedAuthority: "false",
		effectiveFrom: "2026-02-01",
		effectiveTo: "",
		sourceDocumentId: "doc-source-1",
		expectedCompanyVersion: "1",
		idempotencyKey: "idem-grant-1",
		...overrides,
	});
}

describe("Corporate Administration authority actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationAuthorityDependencies.mockReturnValue(
			{ authorityStore: "ca-authority-store" },
		);
	});

	it("stamps session facts and rejects browser organization IDs", async () => {
		const forged = await grantAuthorityMandateAction(
			grantForm({ organizationId: "org-forged" }),
		);

		expect(forged).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR", ok: false }),
		);
		expect(
			corporateAdministrationMocks.grantAuthorityMandate,
		).not.toHaveBeenCalled();

		corporateAdministrationMocks.grantAuthorityMandate.mockResolvedValue({
			ok: true,
			data: { id: mandateId, status: "active", version: 1 },
		});

		const result = await grantAuthorityMandateAction(grantForm());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toEqual({
				authorityMandateId: mandateId,
				status: "active",
				version: 1,
			});
		}
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-authority-action-test",
			idempotencyKey: "idem-grant-1",
		});
		expect(
			corporateAdministrationMocks.grantAuthorityMandate,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				legalCompanyId,
				mandateType: "signing_authority",
				holderPartyId: partyId,
				protectedAuthority: false,
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			{ authorityStore: "ca-authority-store" },
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(
			"/client/corporate-administration",
		);
	});

	it("surfaces the package fail-closed result for protected mandates", async () => {
		corporateAdministrationMocks.grantAuthorityMandate.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Approval is required for protected authority mandates",
		});

		const result = await grantAuthorityMandateAction(
			grantForm({ protectedAuthority: "true" }),
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
		}
		expect(
			corporateAdministrationMocks.grantAuthorityMandate,
		).toHaveBeenCalledWith(
			expect.objectContaining({ protectedAuthority: true }),
			expect.anything(),
			expect.anything(),
		);
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("amends mandates with coerced versions and omitted empty optionals", async () => {
		corporateAdministrationMocks.amendAuthorityMandate.mockResolvedValue({
			ok: true,
			data: { id: mandateId, status: "active", version: 2 },
		});

		const result = await amendAuthorityMandateAction(
			formData({
				organizationSlug: "afenda",
				authorityMandateId: mandateId,
				scopeDescription: "Sign supplier and customer contracts",
				monetaryLimitAmount: "50000.00",
				monetaryLimitCurrencyCode: "MYR",
				jurisdictionCode: "",
				effectiveTo: "",
				sourceDocumentId: "doc-source-2",
				expectedVersion: "1",
				idempotencyKey: "idem-amend-1",
			}),
		);

		expect(result.ok).toBe(true);
		expect(
			corporateAdministrationMocks.amendAuthorityMandate,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				authorityMandateId: mandateId,
				scopeDescription: "Sign supplier and customer contracts",
				monetaryLimitAmount: "50000",
				monetaryLimitCurrencyCode: "MYR",
				expectedVersion: 1,
			}),
			expect.anything(),
			expect.anything(),
		);
		const [amendPayload] =
			corporateAdministrationMocks.amendAuthorityMandate.mock.calls[0] ?? [];
		expect(amendPayload).not.toHaveProperty("jurisdictionCode");
		expect(amendPayload).not.toHaveProperty("effectiveTo");
	});

	it("rejects revocation submissions with invalid payloads before execution", async () => {
		const result = await revokeAuthorityMandateAction(
			formData({
				organizationSlug: "afenda",
				authorityMandateId: mandateId,
				revokedOn: "2026-03-01",
				reason: "",
				sourceDocumentId: "doc-source-3",
				expectedVersion: "1",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR", ok: false }),
		);
		expect(
			corporateAdministrationMocks.revokeAuthorityMandate,
		).not.toHaveBeenCalled();
	});

	it("rejects grants that name both holders before execution", async () => {
		const result = await grantAuthorityMandateAction(
			grantForm({
				holderOfficerAppointmentId: "33333333-3333-4333-8333-333333333333",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR", ok: false }),
		);
		expect(
			corporateAdministrationMocks.grantAuthorityMandate,
		).not.toHaveBeenCalled();
	});

	it("denies the action when the member lacks the authority permission", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Forbidden",
		});

		const result = await grantAuthorityMandateAction(grantForm());

		expect(result.ok).toBe(false);
		expect(
			corporateAdministrationMocks.grantAuthorityMandate,
		).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			memberSession,
			"corporate_administration.authority.manage",
		);
	});
});
