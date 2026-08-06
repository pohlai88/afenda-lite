/**
 * HR statutory-profile Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-statutory-operator",
	orgId: "org-hr-statutory-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrMocks = vi.hoisted(() => ({
	upsertStatutoryProfile: vi.fn(),
	getStatutoryProfile: vi.fn(),
	listStatutoryProfiles: vi.fn(),
	recordPriorEmployerYtd: vi.fn(),
	listPriorEmployerYtd: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { requireRole: authMocks.requireRole } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-hr-statutory-test" } },
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	getStatutoryProfileAction,
	listPriorEmployerYtdAction,
	listStatutoryProfilesAction,
	recordPriorEmployerYtdAction,
	upsertStatutoryProfileAction,
} from "../app/actions/hr-statutory-profile";

const employeeId = "11111111-1111-4111-8111-111111111111";
const profileId = "22222222-2222-4222-8222-222222222222";
const priorYtdId = "33333333-3333-4333-8333-333333333333";

const upsertInput = {
	idempotencyKey: "idem-statutory-1",
	employeeId,
	jurisdictionCode: "MY" as const,
	taxResidencyStatus: "resident" as const,
	nationalityCountryCode: "MY",
	expatriate: false,
	dependantCount: 0,
	reliefDeclarations: [],
	effectiveFrom: "2026-01-01",
};

describe("HR statutory-profile Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrMocks.upsertStatutoryProfile.mockResolvedValue({
			ok: true,
			data: { id: profileId, employeeId },
		});
		hrMocks.getStatutoryProfile.mockResolvedValue({
			ok: true,
			data: { id: profileId, employeeId },
		});
		hrMocks.listStatutoryProfiles.mockResolvedValue({
			ok: true,
			data: { items: [{ id: profileId }], page: 1, pageSize: 20 },
		});
		hrMocks.recordPriorEmployerYtd.mockResolvedValue({
			ok: true,
			data: { id: priorYtdId, employeeId },
		});
		hrMocks.listPriorEmployerYtd.mockResolvedValue({
			ok: true,
			data: [{ id: priorYtdId, employeeId }],
		});
	});

	it("denies upsertStatutoryProfileAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await upsertStatutoryProfileAction(upsertInput);

		expect(result.ok).toBe(false);
		expect(hrMocks.upsertStatutoryProfile).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.sensitive-identifiers.manage",
		);
	});

	it("rejects invalid upsertStatutoryProfileAction input before calling the domain", async () => {
		const result = await upsertStatutoryProfileAction({
			...upsertInput,
			jurisdictionCode: "XX",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrMocks.upsertStatutoryProfile).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation on upsertStatutoryProfileAction", async () => {
		const result = await upsertStatutoryProfileAction(upsertInput);

		expect(result.ok).toBe(true);
		expect(hrMocks.upsertStatutoryProfile).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-statutory-test",
				...upsertInput,
			},
			expect.objectContaining({
				authorization: expect.anything(),
			}),
		);
	});

	it("reads statutory profiles with sensitive-identifiers.read", async () => {
		const getResult = await getStatutoryProfileAction({ employeeId });
		const listResult = await listStatutoryProfilesAction({ employeeId });

		expect(getResult.ok).toBe(true);
		expect(listResult.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.sensitive-identifiers.read",
		);
		expect(hrMocks.getStatutoryProfile).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-statutory-test",
				employeeId,
			},
			expect.anything(),
		);
	});

	it("stamps recordPriorEmployerYtdAction from the operator session", async () => {
		const result = await recordPriorEmployerYtdAction({
			idempotencyKey: "idem-prior-ytd-1",
			employeeId,
			jurisdictionCode: "MY",
			taxYear: 2026,
			grossAmount: "10000.00",
			taxWithheldAmount: "1000.00",
			statutoryContributionAmount: "500.00",
			currencyCode: "MYR",
			recordedOn: "2026-03-15",
		});

		expect(result.ok).toBe(true);
		expect(hrMocks.recordPriorEmployerYtd).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-statutory-test",
				idempotencyKey: "idem-prior-ytd-1",
				employeeId,
				jurisdictionCode: "MY",
				taxYear: 2026,
				grossAmount: "10000.00",
				taxWithheldAmount: "1000.00",
				statutoryContributionAmount: "500.00",
				currencyCode: "MYR",
				recordedOn: "2026-03-15",
			},
			expect.anything(),
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.sensitive-identifiers.manage",
		);
	});

	it("lists prior-employer YTD with sensitive-identifiers.read", async () => {
		const result = await listPriorEmployerYtdAction({
			employeeId,
			taxYear: 2026,
		});

		expect(result.ok).toBe(true);
		expect(hrMocks.listPriorEmployerYtd).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-statutory-test",
				employeeId,
				taxYear: 2026,
			},
			expect.anything(),
		);
	});
});
