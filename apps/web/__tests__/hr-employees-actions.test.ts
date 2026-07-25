/**
 * HR Employees Server Actions — permission deny, org stamp, self profile path.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-employees-operator",
	orgId: "org-hr-employees-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const memberSession = {
	userId: "user-hr-employees-member",
	orgId: "org-hr-employees-active",
	role: "client" as const,
	email: "employee@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	getSession: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrEmployeeMocks = vi.hoisted(() => ({
	createEmployee: vi.fn(),
	getEmployeeProfile: vi.fn(),
	resolveEmployeeForActor: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
	getSession: authMocks.getSession,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-employees-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		createEmployee: hrEmployeeMocks.createEmployee,
		getEmployeeProfile: hrEmployeeMocks.getEmployeeProfile,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({ kind: "hr-options" }),
}));

vi.mock("@/lib/erp/human-resources-identity-resolver-port", () => ({
	createHumanResourcesIdentityResolverPort: () => ({
		resolveEmployeeForActor: hrEmployeeMocks.resolveEmployeeForActor,
	}),
}));

import {
	createEmployeeAction,
	getEmployeeProfileAction,
	getOwnEmployeeProfileAction,
} from "../app/actions/hr-employees";

const linkedEmployeeId = "11111111-1111-4111-8111-111111111111";

describe("HR Employees Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrEmployeeMocks.createEmployee.mockResolvedValue({
			ok: true,
			data: { id: linkedEmployeeId, employeeNumber: "E001" },
		});
		hrEmployeeMocks.getEmployeeProfile.mockResolvedValue({
			ok: true,
			data: { employeeId: linkedEmployeeId, legalName: "Ada Lovelace" },
		});
		hrEmployeeMocks.resolveEmployeeForActor.mockResolvedValue({
			ok: true,
			data: { employeeId: linkedEmployeeId },
		});
	});

	it("denies createEmployeeAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createEmployeeAction({
			idempotencyKey: "idem-1",
			employeeNumber: "E001",
			legalName: "Ada Lovelace",
		});

		expect(result.ok).toBe(false);
		expect(hrEmployeeMocks.createEmployee).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employee.create",
		);
	});

	it("stamps org and actor on createEmployeeAction", async () => {
		const result = await createEmployeeAction({
			idempotencyKey: "idem-1",
			employeeNumber: "E001",
			legalName: "Ada Lovelace",
		});

		expect(result.ok).toBe(true);
		expect(hrEmployeeMocks.createEmployee).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-employees-test",
				employeeNumber: "E001",
			}),
			{ kind: "hr-options" },
		);
	});

	it("stamps org and actor on getEmployeeProfileAction", async () => {
		const result = await getEmployeeProfileAction({
			employeeId: linkedEmployeeId,
			asOf: "2026-01-15",
		});

		expect(result.ok).toBe(true);
		expect(hrEmployeeMocks.getEmployeeProfile).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				employeeId: linkedEmployeeId,
				asOf: "2026-01-15",
			}),
			{ kind: "hr-options" },
		);
	});

	it("getOwnEmployeeProfileAction resolves employee from session identity", async () => {
		const result = await getOwnEmployeeProfileAction({
			asOf: "2026-01-15",
		});

		expect(result.ok).toBe(true);
		expect(hrEmployeeMocks.resolveEmployeeForActor).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
		});
		expect(hrEmployeeMocks.getEmployeeProfile).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
				employeeId: linkedEmployeeId,
				asOf: "2026-01-15",
			}),
			{ kind: "hr-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			memberSession,
			"human-resources.employee.read",
		);
	});

	it("getOwnEmployeeProfileAction fails closed without employee mapping", async () => {
		hrEmployeeMocks.resolveEmployeeForActor.mockResolvedValue({
			ok: true,
			data: null,
		});

		const result = await getOwnEmployeeProfileAction({
			asOf: "2026-01-15",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
		}
		expect(hrEmployeeMocks.getEmployeeProfile).not.toHaveBeenCalled();
	});
});
