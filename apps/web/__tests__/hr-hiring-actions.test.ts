/**
 * HR Hiring Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-hiring-operator",
	orgId: "org-hr-hiring-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrHiringMocks = vi.hoisted(() => ({
	hireFromAcceptedOffer: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-hiring-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		hireFromAcceptedOffer: hrHiringMocks.hireFromAcceptedOffer,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
		resourceAwareAuthorization: { canWithContext: vi.fn() },
	}),
}));

import { hireFromAcceptedOfferAction } from "../app/actions/hr-hiring";

const offerId = "11111111-1111-4111-8111-111111111111";
const positionId = "22222222-2222-4222-8222-222222222222";

const hireInput = {
	idempotencyKey: "idem-hire-1",
	offerId,
	employeeNumber: "EMP-9001",
	startsOn: "2026-03-01",
	positionId,
	tasks: [{ code: "identity", title: "Identity documents", mandatory: true }],
	legalEntityKey: "le-1",
	businessUnitKey: "bu-1",
	locationKey: "loc-1",
	costCentreKey: "cc-1",
	projectKey: "proj-1",
};

describe("HR Hiring Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrHiringMocks.hireFromAcceptedOffer.mockResolvedValue({
			ok: true,
			data: { hireAttemptId: "hire-1", status: "completed" },
		});
	});

	it("denies hireFromAcceptedOfferAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await hireFromAcceptedOfferAction(hireInput);

		expect(result.ok).toBe(false);
		expect(hrHiringMocks.hireFromAcceptedOffer).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.hire.orchestrate",
		);
	});

	it("rejects invalid hireFromAcceptedOfferAction input before calling the domain", async () => {
		const result = await hireFromAcceptedOfferAction({
			...hireInput,
			idempotencyKey: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrHiringMocks.hireFromAcceptedOffer).not.toHaveBeenCalled();
	});

	it("stamps org and actor on hireFromAcceptedOfferAction", async () => {
		const result = await hireFromAcceptedOfferAction(hireInput);

		expect(result.ok).toBe(true);
		expect(hrHiringMocks.hireFromAcceptedOffer).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-hiring-test",
				idempotencyKey: "idem-hire-1",
				offerId,
			}),
			expect.any(Object),
		);
	});
});
