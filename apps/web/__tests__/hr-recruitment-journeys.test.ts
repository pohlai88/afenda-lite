import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-recruiter",
	orgId: "org-recruitment",
	role: "operator" as const,
};

const mocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	forbidUnlessPermission: vi.fn(),
	withdrawCandidateConsent: vi.fn(),
	hireFromAcceptedOffer: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-recruitment",
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: mocks.forbidUnlessPermission,
}));
vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({ kind: "hr-options" }),
}));
vi.mock("@afenda/human-resources", async (importOriginal) => ({
	...(await importOriginal<typeof import("@afenda/human-resources")>()),
	withdrawCandidateConsent: mocks.withdrawCandidateConsent,
	hireFromAcceptedOffer: mocks.hireFromAcceptedOffer,
}));

import { hireFromAcceptedOfferAction } from "../app/actions/hr-hiring";
import { withdrawCandidateConsentAction } from "../app/actions/hr-recruitment";

const candidateId = "11111111-1111-4111-8111-111111111111";
const offerId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireRole.mockResolvedValue(session);
	mocks.forbidUnlessPermission.mockResolvedValue(null);
	mocks.withdrawCandidateConsent.mockResolvedValue({
		ok: true,
		data: { id: candidateId, version: 2 },
	});
	mocks.hireFromAcceptedOffer.mockResolvedValue({
		ok: true,
		data: { hireAttemptId: "hire-1", status: "completed" },
	});
});

describe("HR recruitment workspace journeys", () => {
	it("denies candidate consent withdrawal before package access", async () => {
		mocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});
		const result = await withdrawCandidateConsentAction({
			candidateId,
			expectedVersion: 1,
		});
		expect(result.ok).toBe(false);
		expect(mocks.withdrawCandidateConsent).not.toHaveBeenCalled();
		expect(mocks.forbidUnlessPermission).toHaveBeenCalledWith(
			session,
			"human-resources.candidate.manage",
		);
	});

	it("stamps tenant and actor on candidate consent withdrawal", async () => {
		const result = await withdrawCandidateConsentAction({
			candidateId,
			expectedVersion: 1,
		});
		expect(result.ok).toBe(true);
		expect(mocks.withdrawCandidateConsent).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-recruitment",
				actorUserId: "user-recruiter",
				correlationId: "corr-recruitment",
				candidateId,
			}),
			{ kind: "hr-options" },
		);
	});

	it("denies accepted-offer conversion without orchestration permission", async () => {
		mocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});
		const result = await hireFromAcceptedOfferAction({
			idempotencyKey: "hire-attempt-1",
			offerId,
			employeeNumber: "EMP-100",
			startsOn: "2026-08-01",
			tasks: [{ code: "identity", title: "Verify identity", mandatory: true }],
			legalEntityKey: "le-1",
			businessUnitKey: "bu-1",
			locationKey: "loc-1",
			costCentreKey: "cc-1",
			projectKey: "project-1",
		});
		expect(result.ok).toBe(false);
		expect(mocks.hireFromAcceptedOffer).not.toHaveBeenCalled();
		expect(mocks.forbidUnlessPermission).toHaveBeenCalledWith(
			session,
			"human-resources.hire.orchestrate",
		);
	});
});
