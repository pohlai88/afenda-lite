/**
 * HR Leave Server Actions — permission deny, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-leave-operator",
	orgId: "org-hr-leave-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrLeaveMocks = vi.hoisted(() => ({
	createDraftLeaveRequest: vi.fn(),
	submitLeaveRequest: vi.fn(),
	withdrawLeaveRequest: vi.fn(),
	cancelApprovedLeaveRequest: vi.fn(),
	getLeaveBalance: vi.fn(),
	reconcileLeaveBalance: vi.fn(),
	getLeaveEntitlement: vi.fn(),
	approveLeaveRequest: vi.fn(),
	rejectLeaveRequest: vi.fn(),
	returnLeaveRequest: vi.fn(),
	listPendingApprovalLeaveRequests: vi.fn(),
	listTeamCalendarLeaveRequests: vi.fn(),
	createLeavePolicy: vi.fn(),
	getLeavePolicy: vi.fn(),
	listLeavePolicies: vi.fn(),
	resolveApplicableLeavePolicy: vi.fn(),
	getApprovedLeaveHandoff: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-leave-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		createDraftLeaveRequest: hrLeaveMocks.createDraftLeaveRequest,
		submitLeaveRequest: hrLeaveMocks.submitLeaveRequest,
		withdrawLeaveRequest: hrLeaveMocks.withdrawLeaveRequest,
		cancelApprovedLeaveRequest: hrLeaveMocks.cancelApprovedLeaveRequest,
		getLeaveBalance: hrLeaveMocks.getLeaveBalance,
		reconcileLeaveBalance: hrLeaveMocks.reconcileLeaveBalance,
		getLeaveEntitlement: hrLeaveMocks.getLeaveEntitlement,
		approveLeaveRequest: hrLeaveMocks.approveLeaveRequest,
		rejectLeaveRequest: hrLeaveMocks.rejectLeaveRequest,
		returnLeaveRequest: hrLeaveMocks.returnLeaveRequest,
		listPendingApprovalLeaveRequests:
			hrLeaveMocks.listPendingApprovalLeaveRequests,
		listTeamCalendarLeaveRequests: hrLeaveMocks.listTeamCalendarLeaveRequests,
		createLeavePolicy: hrLeaveMocks.createLeavePolicy,
		getLeavePolicy: hrLeaveMocks.getLeavePolicy,
		listLeavePolicies: hrLeaveMocks.listLeavePolicies,
		resolveApplicableLeavePolicy: hrLeaveMocks.resolveApplicableLeavePolicy,
		getApprovedLeaveHandoff: hrLeaveMocks.getApprovedLeaveHandoff,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	approveLeaveRequestAction,
	cancelApprovedLeaveRequestAction,
	createDraftLeaveRequestAction,
	createLeavePolicyAction,
	getApprovedLeaveHandoffAction,
	getLeaveBalanceAction,
	getLeaveEntitlementAction,
	getLeavePolicyAction,
	listLeavePoliciesAction,
	listPendingApprovalLeaveRequestsAction,
	listTeamCalendarLeaveRequestsAction,
	reconcileLeaveBalanceAction,
	rejectLeaveRequestAction,
	resolveApplicableLeavePolicyAction,
	returnLeaveRequestAction,
	submitLeaveRequestAction,
	withdrawLeaveRequestAction,
} from "../app/actions/hr-leave";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";
const entitlementId = "33333333-3333-4333-8333-333333333333";
const requestId = "44444444-4444-4444-8444-444444444444";
const policyId = "55555555-5555-4555-8555-555555555555";

describe("HR Leave Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrLeaveMocks.createDraftLeaveRequest.mockResolvedValue({
			ok: true,
			data: { id: requestId, status: "draft" },
		});
		hrLeaveMocks.submitLeaveRequest.mockResolvedValue({
			ok: true,
			data: { id: requestId, status: "submitted" },
		});
		hrLeaveMocks.withdrawLeaveRequest.mockResolvedValue({
			ok: true,
			data: { id: requestId, status: "withdrawn" },
		});
		hrLeaveMocks.getLeaveBalance.mockResolvedValue({
			ok: true,
			data: { entitlementId, availableQuantity: "5" },
		});
		hrLeaveMocks.approveLeaveRequest.mockResolvedValue({
			ok: true,
			data: { id: requestId, status: "approved" },
		});
		hrLeaveMocks.listTeamCalendarLeaveRequests.mockResolvedValue({
			ok: true,
			data: { entries: [], total: 0, page: 1, pageSize: 20 },
		});
		hrLeaveMocks.createLeavePolicy.mockResolvedValue({
			ok: true,
			data: { id: policyId, status: "draft", code: "ANNUAL" },
		});
		hrLeaveMocks.getApprovedLeaveHandoff.mockResolvedValue({
			ok: true,
			data: { requestId, quantity: "3", segments: [] },
		});
	});

	it("denies leave Actions before package invocation", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Leave is not permitted.",
		});

		const cases = [
			{
				invoke: () =>
					createDraftLeaveRequestAction({
						employeeId,
						entitlementId,
						startDate: "2026-03-01",
						endDate: "2026-03-03",
						requestedQuantity: "3",
						idempotencyKey: "idem-draft-denied",
					}),
				mock: hrLeaveMocks.createDraftLeaveRequest,
				permission: "human-resources.leave-request.own",
			},
			{
				invoke: () =>
					submitLeaveRequestAction({
						requestId,
						expectedVersion: 1,
					}),
				mock: hrLeaveMocks.submitLeaveRequest,
				permission: "human-resources.leave-request.own",
			},
			{
				invoke: () =>
					withdrawLeaveRequestAction({
						requestId,
						expectedVersion: 1,
					}),
				mock: hrLeaveMocks.withdrawLeaveRequest,
				permission: "human-resources.leave-request.own",
			},
			{
				invoke: () =>
					cancelApprovedLeaveRequestAction({
						requestId,
						expectedVersion: 2,
					}),
				mock: hrLeaveMocks.cancelApprovedLeaveRequest,
				permission: "human-resources.leave-request.approve-team",
			},
			{
				invoke: () => getLeaveBalanceAction({ entitlementId }),
				mock: hrLeaveMocks.getLeaveBalance,
				permission: "human-resources.leave-entitlement.read",
			},
			{
				invoke: () => reconcileLeaveBalanceAction({ entitlementId }),
				mock: hrLeaveMocks.reconcileLeaveBalance,
				permission: "human-resources.leave-entitlement.read",
			},
			{
				invoke: () => getLeaveEntitlementAction({ entitlementId }),
				mock: hrLeaveMocks.getLeaveEntitlement,
				permission: "human-resources.leave-entitlement.read",
			},
			{
				invoke: () =>
					approveLeaveRequestAction({
						requestId,
						expectedVersion: 1,
					}),
				mock: hrLeaveMocks.approveLeaveRequest,
				permission: "human-resources.leave-request.approve-team",
			},
			{
				invoke: () =>
					rejectLeaveRequestAction({
						requestId,
						expectedVersion: 1,
					}),
				mock: hrLeaveMocks.rejectLeaveRequest,
				permission: "human-resources.leave-request.approve-team",
			},
			{
				invoke: () =>
					returnLeaveRequestAction({
						requestId,
						expectedVersion: 1,
					}),
				mock: hrLeaveMocks.returnLeaveRequest,
				permission: "human-resources.leave-request.approve-team",
			},
			{
				invoke: () => listPendingApprovalLeaveRequestsAction({}),
				mock: hrLeaveMocks.listPendingApprovalLeaveRequests,
				permission: "human-resources.leave-request.approve-team",
			},
			{
				invoke: () =>
					listTeamCalendarLeaveRequestsAction({
						rangeStart: "2026-03-01",
						rangeEnd: "2026-03-31",
					}),
				mock: hrLeaveMocks.listTeamCalendarLeaveRequests,
				permission: "human-resources.leave-request.approve-team",
			},
			{
				invoke: () =>
					createLeavePolicyAction({
						code: "ANNUAL",
						name: "Annual Leave",
						leaveType: "annual",
						unit: "days",
						paid: true,
						effectiveFrom: "2026-01-01",
						allowedEmploymentStatuses: ["active"],
					}),
				mock: hrLeaveMocks.createLeavePolicy,
				permission: "human-resources.leave-policy.manage",
			},
			{
				invoke: () => getLeavePolicyAction({ policyId }),
				mock: hrLeaveMocks.getLeavePolicy,
				permission: "human-resources.leave-policy.read",
			},
			{
				invoke: () => listLeavePoliciesAction({}),
				mock: hrLeaveMocks.listLeavePolicies,
				permission: "human-resources.leave-policy.read",
			},
			{
				invoke: () =>
					resolveApplicableLeavePolicyAction({
						policyCode: "ANNUAL",
						employeeId,
						employmentId,
						asOfDate: "2026-03-01",
					}),
				mock: hrLeaveMocks.resolveApplicableLeavePolicy,
				permission: "human-resources.leave-policy.read",
			},
			{
				invoke: () => getApprovedLeaveHandoffAction({ requestId }),
				mock: hrLeaveMocks.getApprovedLeaveHandoff,
				permission: "human-resources.leave.handoff.read",
			},
		];

		for (const testCase of cases) {
			vi.clearAllMocks();
			permissionMocks.forbidUnlessPermission.mockResolvedValue({
				ok: false,
				code: "FORBIDDEN",
				message: "Leave is not permitted.",
			});

			const result = await testCase.invoke();
			expect(result).toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Leave is not permitted.",
			});
			expect(testCase.mock).not.toHaveBeenCalled();
			expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
				operatorSession,
				testCase.permission,
			);
		}
	});

	it("rejects invalid leave inputs at the Action boundary", async () => {
		const invalidDraft = await createDraftLeaveRequestAction({
			employeeId: "not-a-uuid",
			entitlementId,
			startDate: "2026-03-01",
			endDate: "2026-03-03",
			requestedQuantity: "3",
			idempotencyKey: "idem-invalid",
		});
		const invalidSubmit = await submitLeaveRequestAction({
			requestId: "not-a-uuid",
			expectedVersion: 1,
		});
		const invalidBalance = await getLeaveBalanceAction({
			entitlementId: "not-a-uuid",
		});
		const invalidCalendar = await listTeamCalendarLeaveRequestsAction({
			rangeStart: "not-a-date",
			rangeEnd: "2026-03-31",
		});
		const invalidPolicy = await createLeavePolicyAction({
			code: "ANNUAL",
			name: "Annual Leave",
			leaveType: "annual",
			unit: "days",
			paid: true,
			effectiveFrom: "not-a-date",
			allowedEmploymentStatuses: ["active"],
		});
		const invalidHandoff = await getApprovedLeaveHandoffAction({
			requestId: "not-a-uuid",
		});

		for (const result of [
			invalidDraft,
			invalidSubmit,
			invalidBalance,
			invalidCalendar,
			invalidPolicy,
			invalidHandoff,
		]) {
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrLeaveMocks.createDraftLeaveRequest).not.toHaveBeenCalled();
		expect(hrLeaveMocks.submitLeaveRequest).not.toHaveBeenCalled();
		expect(hrLeaveMocks.getLeaveBalance).not.toHaveBeenCalled();
		expect(hrLeaveMocks.listTeamCalendarLeaveRequests).not.toHaveBeenCalled();
		expect(hrLeaveMocks.createLeavePolicy).not.toHaveBeenCalled();
		expect(hrLeaveMocks.getApprovedLeaveHandoff).not.toHaveBeenCalled();
	});

	it("stamps org and actor on createDraftLeaveRequestAction", async () => {
		const result = await createDraftLeaveRequestAction({
			employeeId,
			entitlementId,
			startDate: "2026-03-01",
			endDate: "2026-03-03",
			requestedQuantity: "3",
			idempotencyKey: "idem-draft-1",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave-request.own",
		);
		expect(hrLeaveMocks.createDraftLeaveRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-leave-test",
				employeeId,
				entitlementId,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("delegates submitLeaveRequestAction with own permission", async () => {
		const result = await submitLeaveRequestAction({
			requestId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave-request.own",
		);
		expect(hrLeaveMocks.submitLeaveRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				requestId,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("delegates withdrawLeaveRequestAction with own permission", async () => {
		const result = await withdrawLeaveRequestAction({
			requestId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave-request.own",
		);
		expect(hrLeaveMocks.withdrawLeaveRequest).toHaveBeenCalled();
	});

	it("delegates getLeaveBalanceAction with entitlement read permission", async () => {
		const result = await getLeaveBalanceAction({ entitlementId });

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave-entitlement.read",
		);
		expect(hrLeaveMocks.getLeaveBalance).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				entitlementId,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("delegates approveLeaveRequestAction with approve-team permission", async () => {
		const result = await approveLeaveRequestAction({
			requestId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave-request.approve-team",
		);
		expect(hrLeaveMocks.approveLeaveRequest).toHaveBeenCalled();
	});

	it("delegates listTeamCalendarLeaveRequestsAction with approve-team permission", async () => {
		const result = await listTeamCalendarLeaveRequestsAction({
			rangeStart: "2026-03-01",
			rangeEnd: "2026-03-31",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave-request.approve-team",
		);
		expect(hrLeaveMocks.listTeamCalendarLeaveRequests).toHaveBeenCalledWith(
			expect.objectContaining({
				rangeStart: "2026-03-01",
				rangeEnd: "2026-03-31",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("delegates createLeavePolicyAction with manage permission", async () => {
		const result = await createLeavePolicyAction({
			code: "ANNUAL",
			name: "Annual Leave",
			leaveType: "annual",
			unit: "days",
			paid: true,
			effectiveFrom: "2026-01-01",
			allowedEmploymentStatuses: ["active"],
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave-policy.manage",
		);
		expect(hrLeaveMocks.createLeavePolicy).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				code: "ANNUAL",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("delegates getApprovedLeaveHandoffAction with leave.handoff.read permission", async () => {
		const result = await getApprovedLeaveHandoffAction({ requestId });

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave.handoff.read",
		);
		expect(permissionMocks.forbidUnlessPermission).not.toHaveBeenCalledWith(
			operatorSession,
			"human-resources.leave-request.approve-team",
		);
		expect(hrLeaveMocks.getApprovedLeaveHandoff).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				requestId,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
