/**
 * HR Employment Server Actions — permission deny, org stamp, lifecycle delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-employment-operator",
	orgId: "org-hr-employment-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrEmploymentMocks = vi.hoisted(() => ({
	hireEmployment: vi.fn(),
	rehireEmployment: vi.fn(),
	createEmploymentContract: vi.fn(),
	getEmployment: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { requireRole: authMocks.requireRole } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-hr-employment-test" } },
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		hireEmployment: hrEmploymentMocks.hireEmployment,
		rehireEmployment: hrEmploymentMocks.rehireEmployment,
		createEmploymentContract: hrEmploymentMocks.createEmploymentContract,
		getEmployment: hrEmploymentMocks.getEmployment,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	createEmploymentContractAction,
	getEmploymentAction,
	hireEmploymentAction,
	rehireEmploymentAction,
} from "../app/actions/hr-employment";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";

describe("HR Employment Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrEmploymentMocks.hireEmployment.mockResolvedValue({
			ok: true,
			data: { id: employmentId, employeeId, status: "active" },
		});
		hrEmploymentMocks.rehireEmployment.mockResolvedValue({
			ok: true,
			data: { id: employmentId, employeeId, status: "active" },
		});
		hrEmploymentMocks.createEmploymentContract.mockResolvedValue({
			ok: true,
			data: { id: "contract-1", employmentId },
		});
		hrEmploymentMocks.getEmployment.mockResolvedValue({
			ok: true,
			data: { id: employmentId, employeeId, status: "active" },
		});
	});

	it("denies hireEmploymentAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await hireEmploymentAction({
			employeeId,
			startsOn: "2026-01-01",
		});

		expect(result.ok).toBe(false);
		expect(hrEmploymentMocks.hireEmployment).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employment.manage",
		);
	});

	it("stamps org and actor on hireEmploymentAction", async () => {
		const result = await hireEmploymentAction({
			employeeId,
			startsOn: "2026-01-01",
		});

		expect(result.ok).toBe(true);
		expect(hrEmploymentMocks.hireEmployment).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-employment-test",
				employeeId,
				startsOn: "2026-01-01",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("delegates rehireEmploymentAction to package command", async () => {
		const result = await rehireEmploymentAction({
			employeeId,
			startsOn: "2027-01-01",
		});

		expect(result.ok).toBe(true);
		expect(hrEmploymentMocks.rehireEmployment).toHaveBeenCalledWith(
			expect.objectContaining({
				employeeId,
				startsOn: "2027-01-01",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("stamps org and actor on createEmploymentContractAction", async () => {
		const result = await createEmploymentContractAction({
			employmentId,
			referenceCode: "CON-001",
			startsOn: "2026-01-01",
			reasonCode: "hire",
		});

		expect(result.ok).toBe(true);
		expect(hrEmploymentMocks.createEmploymentContract).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				employmentId,
				referenceCode: "CON-001",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("uses employee.read permission for getEmploymentAction", async () => {
		const result = await getEmploymentAction({ employmentId });

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employee.read",
		);
		expect(hrEmploymentMocks.getEmployment).toHaveBeenCalledWith(
			expect.objectContaining({ employmentId }),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});
});
