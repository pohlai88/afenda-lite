/**
 * HR People Server Actions — permission deny, org stamp, Result→ActionResult.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-people-operator",
	orgId: "org-hr-people-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrPeopleMocks = vi.hoisted(() => ({
	createPerson: vi.fn(),
	getPersonById: vi.fn(),
	createWorker: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-people-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		createPerson: hrPeopleMocks.createPerson,
		getPersonById: hrPeopleMocks.getPersonById,
		createWorker: hrPeopleMocks.createWorker,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
		resourceAwareAuthorization: { canWithContext: vi.fn() },
	}),
}));

import {
	createPersonAction,
	createWorkerAction,
	getPersonAction,
} from "../app/actions/hr-people";

describe("HR People Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrPeopleMocks.createPerson.mockResolvedValue({
			ok: true,
			data: { id: "person-1", legalName: "Ada Lovelace" },
		});
		hrPeopleMocks.getPersonById.mockResolvedValue({
			ok: true,
			data: { id: "person-1", legalName: "Ada Lovelace" },
		});
		hrPeopleMocks.createWorker.mockResolvedValue({
			ok: true,
			data: { id: "worker-1", personId: "person-1" },
		});
	});

	it("denies createPersonAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createPersonAction({
			idempotencyKey: "idem-1",
			legalName: "Ada Lovelace",
		});

		expect(result.ok).toBe(false);
		expect(hrPeopleMocks.createPerson).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.person.manage",
		);
	});

	it("rejects invalid createPersonAction input before calling the domain", async () => {
		const result = await createPersonAction({
			idempotencyKey: "",
			legalName: "Ada Lovelace",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrPeopleMocks.createPerson).not.toHaveBeenCalled();
	});

	it("stamps org and actor on createPersonAction", async () => {
		const result = await createPersonAction({
			idempotencyKey: "idem-1",
			legalName: "Ada Lovelace",
		});

		expect(result.ok).toBe(true);
		expect(hrPeopleMocks.createPerson).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-people-test",
				idempotencyKey: "idem-1",
				legalName: "Ada Lovelace",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("maps package failure for getPersonAction", async () => {
		hrPeopleMocks.getPersonById.mockResolvedValue({
			ok: false,
			code: "NOT_FOUND",
			message: "Person not found.",
		});

		const result = await getPersonAction({
			personId: "11111111-1111-4111-8111-111111111111",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("NOT_FOUND");
		}
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.person.read",
		);
	});

	it("stamps org and actor on createWorkerAction for employee worker type", async () => {
		const result = await createWorkerAction({
			idempotencyKey: "idem-worker-1",
			personId: "11111111-1111-4111-8111-111111111111",
			workerType: "employee",
			effectiveFrom: "2026-01-01",
		});

		expect(result.ok).toBe(true);
		expect(hrPeopleMocks.createWorker).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				workerType: "employee",
				effectiveFrom: "2026-01-01",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});
});
