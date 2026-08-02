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
	registerLegalCompanyDraft: vi.fn(),
	updateLegalCompanyProfile: vi.fn(),
	setCompanyJurisdictionProfile: vi.fn(),
	supersedeCompanyJurisdictionProfile: vi.fn(),
	listLegalCompanies: vi.fn(),
	getLegalCompany: vi.fn(),
	listCompanyNames: vi.fn(),
	findCompanyLegalFormAsOf: vi.fn(),
	listCompanyIdentifiers: vi.fn(),
	findCompanyFinancialYearAsOf: vi.fn(),
	listCompanyActivitiesAsOf: vi.fn(),
	listLegalEstablishmentsAsOf: vi.fn(),
	findRegisteredAddressAsOf: vi.fn(),
	listPremisesAsOf: vi.fn(),
	getCompanyCompletenessForActivation: vi.fn(),
	listGovernanceMeetings: vi.fn(),
	listResolutionsAsOf: vi.fn(),
	listOverdueResolutionActions: vi.fn(),
}));

const compositionMocks = vi.hoisted(() => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationQueryOptions: vi.fn(),
	createCorporateAdministrationLegalCompanyDependencies: vi.fn(),
	createCorporateAdministrationCompanyDependencies: vi.fn(),
	createCorporateAdministrationGovernanceDependencies: vi.fn(),
	listCorporateAdministrationActiveOrganizationParties: vi.fn(),
	listCorporateAdministrationPartyAddresses: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: authMocks.getSession, requireRole: vi.fn() } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@/features/auth/require-permission", () => ({
	requirePermission: vi.fn(),
}));

vi.mock("@/modules/identity/domain/session-permission", () => ({
	sessionHasPermission: vi.fn(async () => true),
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-action-test" } },
}));

vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	registerLegalCompanyDraft:
		corporateAdministrationMocks.registerLegalCompanyDraft,
	updateLegalCompanyProfile:
		corporateAdministrationMocks.updateLegalCompanyProfile,
	setCompanyJurisdictionProfile:
		corporateAdministrationMocks.setCompanyJurisdictionProfile,
	supersedeCompanyJurisdictionProfile:
		corporateAdministrationMocks.supersedeCompanyJurisdictionProfile,
	listLegalCompanies: corporateAdministrationMocks.listLegalCompanies,
	getLegalCompany: corporateAdministrationMocks.getLegalCompany,
	listCompanyNames: corporateAdministrationMocks.listCompanyNames,
	findCompanyLegalFormAsOf:
		corporateAdministrationMocks.findCompanyLegalFormAsOf,
	listCompanyIdentifiers: corporateAdministrationMocks.listCompanyIdentifiers,
	findCompanyFinancialYearAsOf:
		corporateAdministrationMocks.findCompanyFinancialYearAsOf,
	listCompanyActivitiesAsOf:
		corporateAdministrationMocks.listCompanyActivitiesAsOf,
	listLegalEstablishmentsAsOf:
		corporateAdministrationMocks.listLegalEstablishmentsAsOf,
	findRegisteredAddressAsOf:
		corporateAdministrationMocks.findRegisteredAddressAsOf,
	listPremisesAsOf: corporateAdministrationMocks.listPremisesAsOf,
	getCompanyCompletenessForActivation:
		corporateAdministrationMocks.getCompanyCompletenessForActivation,
	listGovernanceMeetings: corporateAdministrationMocks.listGovernanceMeetings,
	listResolutionsAsOf: corporateAdministrationMocks.listResolutionsAsOf,
	listOverdueResolutionActions:
		corporateAdministrationMocks.listOverdueResolutionActions,
}));

vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions:
		compositionMocks.createCorporateAdministrationCommandOptions,
	createCorporateAdministrationQueryOptions:
		compositionMocks.createCorporateAdministrationQueryOptions,
	createCorporateAdministrationLegalCompanyDependencies:
		compositionMocks.createCorporateAdministrationLegalCompanyDependencies,
	createCorporateAdministrationCompanyDependencies:
		compositionMocks.createCorporateAdministrationCompanyDependencies,
	createCorporateAdministrationGovernanceDependencies:
		compositionMocks.createCorporateAdministrationGovernanceDependencies,
	listCorporateAdministrationActiveOrganizationParties:
		compositionMocks.listCorporateAdministrationActiveOrganizationParties,
	listCorporateAdministrationPartyAddresses:
		compositionMocks.listCorporateAdministrationPartyAddresses,
}));

vi.mock("next/cache", () => ({
	revalidatePath: cacheMocks.revalidatePath,
}));

vi.mock("@afenda/db", () => ({
	and: vi.fn(),
	asc: vi.fn(),
	eq: vi.fn(),
	mdParty: {
		id: "id",
		code: "code",
		name: "name",
		normalizedCode: "normalizedCode",
		organizationId: "organizationId",
		partyKind: "partyKind",
		status: "status",
	},
	database: {
		client: {
			select: vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						orderBy: vi.fn(() => ({
							limit: vi.fn(async () => [
								{
									id: "11111111-1111-4111-8111-111111111111",
									code: "AF-PARTY",
									name: "Afenda Party",
								},
							]),
						})),
					})),
				})),
			})),
		},
	},
}));

import { registerLegalCompanyDraftAction } from "../app/actions/register-legal-company-draft";
import { setCompanyJurisdictionProfileAction } from "../app/actions/set-company-jurisdiction-profile";
import { supersedeCompanyJurisdictionProfileAction } from "../app/actions/supersede-company-jurisdiction-profile";
import { updateLegalCompanyProfileAction } from "../app/actions/update-legal-company-profile";
import { CorporateAdministrationShell } from "../features/corporate-administration/corporate-administration-shell";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration legal-company Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationQueryOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationLegalCompanyDependencies.mockReturnValue(
			{ store: "ca-store" },
		);
		compositionMocks.createCorporateAdministrationCompanyDependencies.mockReturnValue(
			{ store: "ca-store" },
		);
		compositionMocks.createCorporateAdministrationGovernanceDependencies.mockReturnValue(
			{
				store: "ca-store",
				governanceStore: "ca-governance-store",
				meetingStore: "ca-meeting-store",
				resolutionStore: "ca-resolution-store",
			},
		);
		compositionMocks.listCorporateAdministrationActiveOrganizationParties.mockResolvedValue(
			[
				{
					id: "11111111-1111-4111-8111-111111111111",
					code: "AF-PARTY",
					name: "Afenda Party",
				},
			],
		);
		compositionMocks.listCorporateAdministrationPartyAddresses.mockResolvedValue(
			[],
		);
		corporateAdministrationMocks.listLegalCompanies.mockResolvedValue({
			ok: true,
			data: {
				items: [],
				nextCursor: null,
			},
		});
		corporateAdministrationMocks.listCompanyNames.mockResolvedValue({
			ok: true,
			data: { items: [], nextCursor: null },
		});
		corporateAdministrationMocks.findCompanyLegalFormAsOf.mockResolvedValue({
			ok: true,
			data: null,
		});
		corporateAdministrationMocks.listCompanyIdentifiers.mockResolvedValue({
			ok: true,
			data: { items: [], nextCursor: null },
		});
		corporateAdministrationMocks.findCompanyFinancialYearAsOf.mockResolvedValue(
			{
				ok: true,
				data: null,
			},
		);
		corporateAdministrationMocks.listCompanyActivitiesAsOf.mockResolvedValue({
			ok: true,
			data: { items: [], nextCursor: null },
		});
		corporateAdministrationMocks.listLegalEstablishmentsAsOf.mockResolvedValue({
			ok: true,
			data: { items: [], nextCursor: null },
		});
		corporateAdministrationMocks.findRegisteredAddressAsOf.mockResolvedValue({
			ok: true,
			data: null,
		});
		corporateAdministrationMocks.listPremisesAsOf.mockResolvedValue({
			ok: true,
			data: { items: [], nextCursor: null },
		});
		corporateAdministrationMocks.getCompanyCompletenessForActivation.mockResolvedValue(
			{
				ok: true,
				data: {
					legalCompanyId: "22222222-2222-4222-8222-222222222222",
					hasJurisdictionProfile: true,
					hasLegalName: false,
					hasLegalForm: false,
					hasCompanyIdentifier: false,
					hasFinancialYear: false,
					hasRegisteredActivity: false,
					hasRegisteredAddress: false,
					complete: false,
					missing: [
						"hasLegalName",
						"hasLegalForm",
						"hasCompanyIdentifier",
						"hasFinancialYear",
						"hasRegisteredActivity",
						"hasRegisteredAddress",
					],
				},
			},
		);
		corporateAdministrationMocks.listGovernanceMeetings.mockResolvedValue({
			ok: true,
			data: { items: [], nextCursor: null },
		});
		corporateAdministrationMocks.listResolutionsAsOf.mockResolvedValue({
			ok: true,
			data: [],
		});
		corporateAdministrationMocks.listOverdueResolutionActions.mockResolvedValue({
			ok: true,
			data: [],
		});
	});

	it("denies register when company manage permission is missing", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await registerLegalCompanyDraftAction(
			formData({
				companyCode: "AF-MY",
				displayName: "Afenda Malaysia",
				masterDataPartyId: "11111111-1111-4111-8111-111111111111",
				homeJurisdictionCountryCode: "MY",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});
		expect(
			corporateAdministrationMocks.registerLegalCompanyDraft,
		).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			memberSession,
			"corporate_administration.company.manage",
		);
	});

	it("stamps session org and actor on register", async () => {
		corporateAdministrationMocks.registerLegalCompanyDraft.mockResolvedValue({
			ok: true,
			data: { legalCompanyId: "22222222-2222-4222-8222-222222222222" },
		});

		const result = await registerLegalCompanyDraftAction(
			formData({
				companyCode: "AF-MY",
				displayName: "Afenda Malaysia",
				masterDataPartyId: "11111111-1111-4111-8111-111111111111",
				homeJurisdictionCountryCode: "my",
				idempotencyKey: "idem-register",
			}),
		);

		expect(result.ok).toBe(true);
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-action-test",
			idempotencyKey: "idem-register",
		});
		expect(
			corporateAdministrationMocks.registerLegalCompanyDraft,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				companyCode: "AF-MY",
				displayName: "Afenda Malaysia",
				homeJurisdictionCountryCode: "MY",
			}),
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			expect.any(Object),
		);
	});

	it("maps stale-version feedback from profile update", async () => {
		corporateAdministrationMocks.updateLegalCompanyProfile.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message: "Corporate Administration legal company version is stale.",
			details: { reason: "CORPORATE_ADMINISTRATION_STALE_VERSION" },
		});

		const result = await updateLegalCompanyProfileAction(
			formData({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				expectedVersion: "1",
				displayName: "Afenda Malaysia Sdn Bhd",
				sourceReference: "web:test",
				idempotencyKey: "idem-profile",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "CONFLICT",
			message: "Corporate Administration legal company version is stale.",
			details: { reason: "CORPORATE_ADMINISTRATION_STALE_VERSION" },
		});
		expect(
			corporateAdministrationMocks.updateLegalCompanyProfile,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				expectedVersion: 1,
				profile: expect.objectContaining({
					displayName: "Afenda Malaysia Sdn Bhd",
				}),
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			expect.any(Object),
		);
	});

	it("maps overlap feedback from jurisdiction profile set", async () => {
		corporateAdministrationMocks.setCompanyJurisdictionProfile.mockResolvedValue(
			{
				ok: false,
				code: "CONFLICT",
				message:
					"Corporate Administration jurisdiction profile overlaps an existing profile.",
				details: {
					reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				},
			},
		);

		const result = await setCompanyJurisdictionProfileAction(
			formData({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				jurisdictionCountryCode: "MY",
				entityType: "private_limited_company",
				effectiveFrom: "2026-01-01",
				effectiveTo: "2026-12-31",
				expectedCompanyVersion: "1",
				sourceReference: "web:test",
				idempotencyKey: "idem-jurisdiction",
			}),
		);

		expect(result.ok).toBe(false);
		expect(result).toEqual(
			expect.objectContaining({
				code: "CONFLICT",
				details: {
					reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				},
			}),
		);
		expect(
			corporateAdministrationMocks.setCompanyJurisdictionProfile,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				effectiveRange: { from: "2026-01-01", to: "2026-12-31" },
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			expect.any(Object),
		);
	});

	it("stamps session org and actor on jurisdiction supersession", async () => {
		corporateAdministrationMocks.supersedeCompanyJurisdictionProfile.mockResolvedValue(
			{
				ok: true,
				data: {
					jurisdictionProfileId: "33333333-3333-4333-8333-333333333333",
				},
			},
		);

		const result = await supersedeCompanyJurisdictionProfileAction(
			formData({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				jurisdictionProfileId: "33333333-3333-4333-8333-333333333333",
				jurisdictionCountryCode: "SG",
				entityType: "private_limited_company",
				effectiveFrom: "2027-01-01",
				expectedProfileVersion: "0",
				sourceReference: "web:test",
				idempotencyKey: "idem-supersede",
			}),
		);

		expect(result.ok).toBe(true);
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-action-test",
			idempotencyKey: "idem-supersede",
		});
		expect(
			corporateAdministrationMocks.supersedeCompanyJurisdictionProfile,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				jurisdictionProfileId: "33333333-3333-4333-8333-333333333333",
				expectedProfileVersion: 0,
			}),
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			expect.any(Object),
		);
	});

	it("revalidates and reloads persisted company data after jurisdiction mutation", async () => {
		corporateAdministrationMocks.setCompanyJurisdictionProfile.mockResolvedValue(
			{
				ok: true,
				data: {
					jurisdictionProfileId: "33333333-3333-4333-8333-333333333333",
				},
			},
		);
		corporateAdministrationMocks.listLegalCompanies.mockResolvedValue({
			ok: true,
			data: {
				items: [
					{
						legalCompanyId: "22222222-2222-4222-8222-222222222222",
					},
				],
				nextCursor: null,
			},
		});
		corporateAdministrationMocks.getLegalCompany.mockResolvedValue({
			ok: true,
			data: {
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyCode: "AF-MY",
				profile: { displayName: "Afenda Malaysia" },
				homeJurisdictionCountryCode: "MY",
				state: "draft",
				version: 2,
				currentJurisdictionProfile: {
					jurisdictionProfileId: "33333333-3333-4333-8333-333333333333",
					jurisdictionCountryCode: "MY",
					entityType: "private_limited_company",
					effectiveRange: { from: "2026-01-01", to: null },
					version: 0,
				},
			},
		});

		const result = await setCompanyJurisdictionProfileAction(
			formData({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				jurisdictionCountryCode: "MY",
				entityType: "private_limited_company",
				effectiveFrom: "2026-01-01",
				expectedCompanyVersion: "1",
				sourceReference: "web:test",
			}),
		);
		await CorporateAdministrationShell({ surface: "client" });

		expect(result.ok).toBe(true);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(
			"/client/corporate-administration",
		);
		expect(
			corporateAdministrationMocks.listLegalCompanies,
		).toHaveBeenCalledWith(
			{ pagination: { limit: 50 } },
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			{ store: "ca-store" },
		);
		expect(corporateAdministrationMocks.getLegalCompany).toHaveBeenCalledWith(
			{ legalCompanyId: "22222222-2222-4222-8222-222222222222" },
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			{ store: "ca-store" },
		);
	});
});
