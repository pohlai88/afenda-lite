import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "privacy-officer",
	orgId: "org-privacy",
	role: "operator" as const,
	email: "privacy@example.com",
};
const authMocks = vi.hoisted(() => ({ requireRole: vi.fn() }));
const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));
const workerMocks = vi.hoisted(() => ({
	evaluate: vi.fn(),
	execute: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { requireRole: authMocks.requireRole } },
}));
vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-privacy-action" } },
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));
vi.mock("@/lib/erp/human-resources-privacy-deletion", () => ({
	evaluateHumanResourcesPrivacyDeletion: workerMocks.evaluate,
	executeApprovedHumanResourcesPrivacyDeletion: workerMocks.execute,
}));

import {
	evaluateHumanResourcesPrivacyDeletionAction,
	executeApprovedHumanResourcesPrivacyDeletionAction,
} from "@/app/actions/hr-privacy-deletion";

const actionInput = {
	subjectEmployeeId: "00000000-0000-4000-8000-000000000701",
	requestedAt: "2026-07-28T00:00:00.000Z",
	legalBasis: "data_subject_erasure_request",
	classifications: [
		{
			classification: "recruitment_and_background" as const,
			retentionEndsAt: "2026-07-01T00:00:00.000Z",
		},
	],
};

describe("HR privacy deletion Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		workerMocks.evaluate.mockResolvedValue({
			ok: true,
			data: { decisionId: "decision-1", status: "approved" },
		});
		workerMocks.execute.mockResolvedValue({
			ok: true,
			data: {
				decision: { decisionId: "decision-1", status: "approved" },
				affectedRecordCount: 2,
				executionReference: "privacy://execution-1",
			},
		});
	});

	it("denies evaluation before invoking the decision worker", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result =
			await evaluateHumanResourcesPrivacyDeletionAction(actionInput);

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(workerMocks.evaluate).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.privacy.anonymize.evaluate",
		);
	});

	it("stamps tenant, actor, and correlation during evaluation", async () => {
		await evaluateHumanResourcesPrivacyDeletionAction(actionInput);

		expect(workerMocks.evaluate).toHaveBeenCalledWith({
			...actionInput,
			organizationId: operatorSession.orgId,
			actorUserId: operatorSession.userId,
			correlationId: "corr-privacy-action",
		});
	});

	it("requires execution permission and invokes fresh approved execution", async () => {
		const result =
			await executeApprovedHumanResourcesPrivacyDeletionAction(actionInput);

		expect(result).toMatchObject({
			ok: true,
			data: { affectedRecordCount: 2 },
		});
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.privacy.anonymize.execute",
		);
		expect(workerMocks.execute).toHaveBeenCalledWith({
			...actionInput,
			organizationId: operatorSession.orgId,
			actorUserId: operatorSession.userId,
			correlationId: "corr-privacy-action",
		});
	});
});
