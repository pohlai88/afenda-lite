import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
	setCompanyLegalForm: vi.fn(),
	supersedeCompanyName: vi.fn(),
	supersedeCompanyLegalForm: vi.fn(),
	retireCompanyName: vi.fn(),
}));

const compositionMocks = vi.hoisted(() => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationCompanyDependencies: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: authMocks.getSession, requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-journey-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", () => ({
	addCompanyName: corporateAdministrationMocks.addCompanyName,
	retireCompanyName: corporateAdministrationMocks.retireCompanyName,
	setCompanyLegalForm: corporateAdministrationMocks.setCompanyLegalForm,
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
	revalidatePath: vi.fn(),
}));

import {
	addCompanyNameAction,
	setCompanyLegalFormAction,
	supersedeCompanyNameAction,
} from "../../app/actions/legal-company-identity-actions";
import {
	CompanyNameHistory,
	type LegalCompanyIdentityLegalForm,
	type LegalCompanyIdentityName,
	LegalFormHistory,
} from "../../features/corporate-administration/legal-company-identity-workspace";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration company-name and legal-form journey", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationCompanyDependencies.mockReturnValue(
			{
				store: "ca-store",
				nameStore: "ca-name-store",
				legalFormStore: "ca-legal-form-store",
			},
		);
	});

	it("runs the authenticated identity workflow and preserves persisted reload state", async () => {
		const names: LegalCompanyIdentityName[] = [
			{
				companyNameId: "33333333-3333-4333-8333-333333333333",
				nameType: "legal",
				languageCode: "en",
				displayName: "Afenda Malaysia Sdn Bhd",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				status: "active",
				version: 1,
			},
		];
		const legalForms: LegalCompanyIdentityLegalForm[] = [];

		corporateAdministrationMocks.addCompanyName.mockImplementation(
			async (input) => {
				const record = {
					companyNameId: "44444444-4444-4444-8444-444444444444",
					nameType: input.nameType,
					languageCode: input.languageCode,
					displayName: input.displayName,
					effectiveFrom: input.effectiveFrom,
					effectiveTo: input.effectiveTo,
					status: "active" as const,
					version: 1,
				};
				names.push(record);
				return await {
					ok: true,
					data: { id: record.companyNameId, version: record.version },
				};
			},
		);
		corporateAdministrationMocks.supersedeCompanyName.mockImplementation(
			async (input) => {
				const predecessorIndex = names.findIndex(
					(name) => name.companyNameId === input.companyNameId,
				);
				const predecessor = names[predecessorIndex];
				if (predecessor !== undefined) {
					names[predecessorIndex] = {
						...predecessor,
						status: "superseded",
						effectiveTo: "2026-12-31",
					};
				}
				names.push({
					companyNameId: "55555555-5555-4555-8555-555555555555",
					nameType: "legal",
					languageCode: input.replacement.languageCode,
					displayName: input.replacement.displayName,
					effectiveFrom: input.replacement.effectiveFrom,
					effectiveTo: null,
					status: "active",
					version: 1,
				});
				return await {
					ok: true,
					data: {
						id: "55555555-5555-4555-8555-555555555555",
						version: 1,
					},
				};
			},
		);
		corporateAdministrationMocks.setCompanyLegalForm
			.mockResolvedValueOnce({
				ok: true,
				data: {
					id: "66666666-6666-4666-8666-666666666666",
					version: 1,
				},
			})
			.mockResolvedValueOnce({
				ok: false,
				code: "CONFLICT",
				message:
					"Corporate Administration legal form overlaps an existing legal form.",
				details: {
					reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				},
			});

		const translatedName = await addCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				nameType: "translated",
				languageCode: "zh",
				displayName: "阿芬达马来西亚",
				effectiveFrom: "2026-01-01",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-journey-translated-name",
			}),
		);
		expect(translatedName.ok).toBe(true);
		expect(authMocks.getSession).toHaveBeenCalled();

		const reloadAfterName = renderToStaticMarkup(
			createElement(CompanyNameHistory, { names }),
		);
		expect(reloadAfterName).toContain("阿芬达马来西亚");

		const supersededName = await supersedeCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyNameId: "33333333-3333-4333-8333-333333333333",
				expectedNameVersion: "1",
				"replacement.nameType": "legal",
				"replacement.languageCode": "en",
				"replacement.displayName": "Afenda Holdings Sdn Bhd",
				"replacement.effectiveFrom": "2027-01-01",
				"replacement.sourceDocumentId": "doc-name-journey",
				"replacement.correctionReason": "Board-approved legal name change.",
				idempotencyKey: "idem-journey-supersede-name",
			}),
		);
		expect(supersededName.ok).toBe(true);
		const reloadAfterSupersession = renderToStaticMarkup(
			createElement(CompanyNameHistory, { names }),
		);
		expect(reloadAfterSupersession).toContain("superseded");
		expect(reloadAfterSupersession).toContain("Afenda Holdings Sdn Bhd");

		const legalForm = await setCompanyLegalFormAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				legalFormCode: "private_limited_company",
				jurisdictionCode: "MY",
				entityTypeCode: "private_limited_company",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-legal-form-journey",
				expectedCompanyVersion: "2",
				idempotencyKey: "idem-journey-legal-form",
			}),
		);
		expect(legalForm.ok).toBe(true);
		legalForms.push({
			legalFormHistoryId: "66666666-6666-4666-8666-666666666666",
			jurisdictionCode: "MY",
			entityTypeCode: "private_limited_company",
			legalFormCode: "private_limited_company",
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
			status: "active",
			version: 1,
		});
		expect(
			renderToStaticMarkup(createElement(LegalFormHistory, { legalForms })),
		).toContain("private_limited_company");

		const overlap = await setCompanyLegalFormAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				legalFormCode: "public_limited_company",
				jurisdictionCode: "MY",
				entityTypeCode: "public_limited_company",
				effectiveFrom: "2026-06-01",
				sourceDocumentId: "doc-legal-form-overlap",
				expectedCompanyVersion: "3",
				idempotencyKey: "idem-journey-overlap",
			}),
		);
		expect(overlap).toEqual(
			expect.objectContaining({
				ok: false,
				code: "CONFLICT",
				details: {
					reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				},
			}),
		);
	});

	it("fails closed before package mutation when tenant permission is denied", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await addCompanyNameAction(
			formData({
				organizationSlug: "other-tenant",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				nameType: "translated",
				languageCode: "ms",
				displayName: "Afenda Malaysia",
				effectiveFrom: "2026-01-01",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-denied-tenant",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});
		expect(corporateAdministrationMocks.addCompanyName).not.toHaveBeenCalled();
	});
});
