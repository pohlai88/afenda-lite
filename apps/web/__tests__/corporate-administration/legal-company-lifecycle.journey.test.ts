import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-ca-lifecycle-journey",
	orgId: "org-ca-lifecycle-journey",
	role: "member" as const,
	email: "member@example.com",
};

const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
const permission = vi.hoisted(() => ({ forbidUnlessPermission: vi.fn() }));
const commands = vi.hoisted(() => ({
	activateLegalCompany: vi.fn(),
	archiveLegalCompany: vi.fn(),
	dissolveLegalCompany: vi.fn(),
	enterLiquidation: vi.fn(),
	markCompanyStruckOff: vi.fn(),
	restoreLegalCompany: vi.fn(),
	suspendLegalCompany: vi.fn(),
}));
const composition = vi.hoisted(() => ({
	createOptions: vi.fn(),
	createDependencies: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: auth.getSession, requireRole: vi.fn() } },
}));
vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-lifecycle-journey" } },
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permission.forbidUnlessPermission,
}));
vi.mock("@afenda/corporate-administration", () => commands);
vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions: composition.createOptions,
	createCorporateAdministrationCompanyDependencies:
		composition.createDependencies,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
	activateLegalCompanyAction,
	enterLiquidationAction,
} from "../../app/actions/legal-company-lifecycle-actions";
import {
	type LegalCompanyActivationCompleteness,
	type LegalCompanyLifecycleCompany,
	LegalCompanyLifecycleWorkspace,
} from "../../features/corporate-administration/legal-company-lifecycle-workspace";

const legalCompanyId = "33333333-3333-4333-8333-333333333333";
const statusHistoryId = "44444444-4444-4444-8444-444444444444";

const completeReadiness: LegalCompanyActivationCompleteness = {
	complete: true,
	missing: [],
	checks: [
		{
			key: "hasJurisdictionProfile",
			label: "Jurisdiction profile",
			complete: true,
		},
		{ key: "hasLegalName", label: "English legal name", complete: true },
		{ key: "hasLegalForm", label: "Legal form", complete: true },
		{
			key: "hasCompanyIdentifier",
			label: "Company registration identifier",
			complete: true,
		},
		{ key: "hasFinancialYear", label: "Financial year", complete: true },
		{
			key: "hasRegisteredActivity",
			label: "Registered activity",
			complete: true,
		},
		{ key: "hasRegisteredAddress", label: "Registered office", complete: true },
	],
};

describe("Corporate Administration CA-1.5 lifecycle journey", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		auth.getSession.mockResolvedValue(session);
		permission.forbidUnlessPermission.mockResolvedValue(null);
		composition.createOptions.mockImplementation((input) => ({
			...input,
			authorization: { can: vi.fn() },
		}));
		composition.createDependencies.mockReturnValue({
			store: "ca-store",
			establishmentStore: "ca-establishment-store",
		});
	});

	it("activates a complete company under the authenticated tenant and renders persisted state", async () => {
		let companyState: LegalCompanyLifecycleCompany["state"] = "draft";
		let companyVersion = 4;
		const company = (): LegalCompanyLifecycleCompany => ({
			legalCompanyId,
			companyCode: "AF-MY",
			displayName: "Afenda Malaysia",
			state: companyState,
			version: companyVersion,
		});
		commands.activateLegalCompany.mockImplementation(async (input) => {
			companyState = "active";
			companyVersion = 5;
			return await {
				ok: true,
				data: {
					id: statusHistoryId,
					legalCompanyId: input.legalCompanyId,
					status: companyState,
					version: companyVersion,
				},
			};
		});

		const initial = renderToStaticMarkup(
			createElement(LegalCompanyLifecycleWorkspace, {
				canWrite: true,
				company: company(),
				completeness: completeReadiness,
				organizationSlug: "afenda",
			}),
		);
		expect(initial).toContain("Activation ready");
		expect(initial).toContain('aria-label="Activation completeness checks"');
		expect(initial).toContain('aria-label="Activate"');
		expect(initial).toContain('for="companyLifecycleActivateEffectiveFrom"');
		expect(initial).toContain('for="companyLifecycleActivateSourceDocument"');
		expect(initial).not.toContain('name="organizationId"');

		const activated = await activateLegalCompanyAction(
			toFormData({
				organizationSlug: "afenda",
				legalCompanyId,
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-ca-1-5-activation",
				expectedCompanyVersion: "4",
				idempotencyKey: "idem-ca-1-5-activation",
			}),
		);

		expect(activated).toEqual({
			ok: true,
			data: {
				companyStatusHistoryId: statusHistoryId,
				legalCompanyId,
				status: "active",
				version: 5,
			},
		});
		expect(composition.createOptions).toHaveBeenCalledWith({
			organizationId: session.orgId,
			actorUserId: session.userId,
			correlationId: "corr-ca-lifecycle-journey",
			idempotencyKey: "idem-ca-1-5-activation",
		});

		const reload = renderToStaticMarkup(
			createElement(LegalCompanyLifecycleWorkspace, {
				canWrite: true,
				company: company(),
				completeness: completeReadiness,
				organizationSlug: "afenda",
			}),
		);
		expect(reload).toContain("Active · v5");
		expect(reload).toContain('aria-label="Suspend"');
		expect(reload).toContain('aria-label="Enter liquidation"');
		expect(reload).toContain(
			'for="companyLifecycleEnterliquidationApprovalRequest"',
		);
		expect(reload).toContain(
			'for="companyLifecycleEnterliquidationApprovalDecision"',
		);
	});

	it("reports high-risk approval failure and denies unauthorized tenant access before persistence", async () => {
		commands.enterLiquidation.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Corporate Administration approval decision is invalid",
			details: { reason: "CORPORATE_ADMINISTRATION_APPROVAL_INVALID" },
		});

		const approvalFailure = await enterLiquidationAction(
			toFormData({
				organizationSlug: "afenda",
				legalCompanyId,
				effectiveFrom: "2026-08-01",
				reason: "Members approved liquidation.",
				sourceDocumentId: "doc-ca-1-5-liquidation",
				expectedCompanyVersion: "5",
				approvalRequestId: "55555555-5555-4555-8555-555555555555",
				approvalDecisionId: "66666666-6666-4666-8666-666666666666",
				idempotencyKey: "idem-ca-1-5-liquidation",
			}),
		);
		expect(approvalFailure).toEqual(
			expect.objectContaining({ ok: false, code: "FORBIDDEN" }),
		);
		expect(commands.enterLiquidation).toHaveBeenCalledWith(
			expect.objectContaining({
				reason: "Members approved liquidation.",
				expectedCompanyVersion: 5,
			}),
			expect.objectContaining({
				approvalRequestId: "55555555-5555-4555-8555-555555555555",
				approvalDecisionId: "66666666-6666-4666-8666-666666666666",
			}),
			expect.any(Object),
		);

		permission.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Not allowed.",
		});
		const denied = await activateLegalCompanyAction(
			toFormData({
				organizationSlug: "other-tenant",
				legalCompanyId,
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-ca-1-5-denied",
				expectedCompanyVersion: "4",
				idempotencyKey: "idem-ca-1-5-denied",
			}),
		);
		expect(denied).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Not allowed.",
		});
		expect(commands.activateLegalCompany).not.toHaveBeenCalled();
	});
});

function toFormData(values: Readonly<Record<string, string>>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(values)) {
		formData.set(key, value);
	}
	return formData;
}
