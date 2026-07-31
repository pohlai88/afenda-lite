/**
 * HR Assignments Server Actions — permission deny, org stamp, transfer delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-assignments-operator",
	orgId: "org-hr-assignments-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrAssignmentMocks = vi.hoisted(() => ({
	createAssignment: vi.fn(),
	transferAssignment: vi.fn(),
	resolveEmployeeOrgContextAsOf: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { requireRole: authMocks.requireRole } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-hr-assignments-test" } },
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		createAssignment: hrAssignmentMocks.createAssignment,
		transferAssignment: hrAssignmentMocks.transferAssignment,
		resolveEmployeeOrgContextAsOf:
			hrAssignmentMocks.resolveEmployeeOrgContextAsOf,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	createAssignmentAction,
	resolveEmployeeOrgContextAsOfAction,
	transferAssignmentAction,
} from "../app/actions/hr-assignments";

const employmentId = "22222222-2222-4222-8222-222222222222";
const positionId = "33333333-3333-4333-8333-333333333333";
const employeeId = "11111111-1111-4111-8111-111111111111";

const dimensionKeys = {
	legalEntityKey: "le-1",
	businessUnitKey: "bu-1",
	locationKey: "loc-1",
	costCentreKey: "cc-1",
	projectKey: "proj-1",
};

describe("HR Assignments Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrAssignmentMocks.createAssignment.mockResolvedValue({
			ok: true,
			data: { id: "assignment-1", employmentId, positionId },
		});
		hrAssignmentMocks.transferAssignment.mockResolvedValue({
			ok: true,
			data: { id: "movement-1", employmentId },
		});
		hrAssignmentMocks.resolveEmployeeOrgContextAsOf.mockResolvedValue({
			ok: true,
			data: { employeeId, employmentId, positionId },
		});
	});

	it("denies transferAssignmentAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await transferAssignmentAction({
			idempotencyKey: "idem-transfer-1",
			employmentId,
			toPositionId: positionId,
			...dimensionKeys,
			effectiveOn: "2026-02-01",
			reason: "Team restructure",
		});

		expect(result.ok).toBe(false);
		expect(hrAssignmentMocks.transferAssignment).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employment.manage",
		);
	});

	it("stamps org and actor on transferAssignmentAction", async () => {
		const result = await transferAssignmentAction({
			idempotencyKey: "idem-transfer-1",
			employmentId,
			toPositionId: positionId,
			...dimensionKeys,
			effectiveOn: "2026-02-01",
			reason: "Team restructure",
		});

		expect(result.ok).toBe(true);
		expect(hrAssignmentMocks.transferAssignment).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-assignments-test",
				employmentId,
				toPositionId: positionId,
				effectiveOn: "2026-02-01",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("stamps org and actor on createAssignmentAction", async () => {
		const result = await createAssignmentAction({
			employmentId,
			positionId,
			...dimensionKeys,
			startsOn: "2026-01-01",
		});

		expect(result.ok).toBe(true);
		expect(hrAssignmentMocks.createAssignment).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				employmentId,
				positionId,
				startsOn: "2026-01-01",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("uses employee.read for resolveEmployeeOrgContextAsOfAction", async () => {
		const result = await resolveEmployeeOrgContextAsOfAction({
			employeeId,
			asOf: "2026-01-15",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employee.read",
		);
		expect(
			hrAssignmentMocks.resolveEmployeeOrgContextAsOf,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				employeeId,
				asOf: "2026-01-15",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});
});
