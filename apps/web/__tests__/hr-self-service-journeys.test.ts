import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-self",
	orgId: "org-self",
	role: "client" as const,
	email: "employee@example.com",
};

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	forbidUnlessPermission: vi.fn(),
	resolveEmployeeForActor: vi.fn(),
	getLeaveEntitlementById: vi.fn(),
	getLeaveRequestById: vi.fn(),
	getTimesheet: vi.fn(),
	getPolicyAcknowledgementById: vi.fn(),
	createDraftLeaveRequest: vi.fn(),
	submitTimesheet: vi.fn(),
	acknowledgePolicy: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: mocks.getSession } },
}));
vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-self" } },
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: mocks.forbidUnlessPermission,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({ kind: "hr-options" }),
}));
vi.mock("@/lib/erp/human-resources-identity-resolver-port", () => ({
	createHumanResourcesIdentityResolverPort: () => ({
		resolveEmployeeForActor: mocks.resolveEmployeeForActor,
	}),
}));
vi.mock("@afenda/human-resources", async (importOriginal) => ({
	...(await importOriginal<typeof import("@afenda/human-resources")>()),
	createDraftLeaveRequest: mocks.createDraftLeaveRequest,
	getLeaveEntitlement: mocks.getLeaveEntitlementById,
	getLeaveRequest: mocks.getLeaveRequestById,
	getPolicyAcknowledgementStatus: mocks.getPolicyAcknowledgementById,
	getTimesheet: mocks.getTimesheet,
	submitTimesheet: mocks.submitTimesheet,
	acknowledgePolicy: mocks.acknowledgePolicy,
}));

import {
	acknowledgeOwnPolicyAction,
	createOwnLeaveDraftAction,
	submitOwnTimesheetAction,
} from "../app/actions/hr-self-service-journeys";

const employeeId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getSession.mockResolvedValue(session);
	mocks.forbidUnlessPermission.mockResolvedValue(null);
	mocks.resolveEmployeeForActor.mockResolvedValue({
		ok: true,
		data: {
			employeeId,
			relationshipType: "self",
			effectiveFrom: "2026-01-01",
			effectiveUntil: null,
		},
	});
});

describe("HR employee self-service journey Actions", () => {
	it("denies before identity or package access when permission is missing", async () => {
		mocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Not allowed.",
		});

		const result = await createOwnLeaveDraftAction(null, new FormData());

		expect(result.ok).toBe(false);
		expect(mocks.resolveEmployeeForActor).not.toHaveBeenCalled();
		expect(mocks.createDraftLeaveRequest).not.toHaveBeenCalled();
	});

	it("fails closed when the account has no employee mapping", async () => {
		mocks.resolveEmployeeForActor.mockResolvedValue({ ok: true, data: null });
		const formData = new FormData();
		formData.set("entitlementId", "22222222-2222-4222-8222-222222222222");
		formData.set("startDate", "2026-08-01");
		formData.set("endDate", "2026-08-02");
		formData.set("requestedQuantity", "2");

		const result = await createOwnLeaveDraftAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Your account is not linked to an active employee record.",
		});
		expect(mocks.getLeaveEntitlementById).not.toHaveBeenCalled();
	});

	it("rejects an entitlement owned by another employee", async () => {
		mocks.getLeaveEntitlementById.mockResolvedValue({
			ok: true,
			data: { employeeId: "33333333-3333-4333-8333-333333333333" },
		});
		const formData = new FormData();
		formData.set("entitlementId", "22222222-2222-4222-8222-222222222222");
		formData.set("startDate", "2026-08-01");
		formData.set("endDate", "2026-08-02");
		formData.set("requestedQuantity", "2");

		const result = await createOwnLeaveDraftAction(null, formData);

		expect(result.ok).toBe(false);
		expect(mocks.createDraftLeaveRequest).not.toHaveBeenCalled();
	});

	it("stamps tenant, actor, correlation and resolved employee on leave draft", async () => {
		mocks.getLeaveEntitlementById.mockResolvedValue({
			ok: true,
			data: { employeeId },
		});
		mocks.createDraftLeaveRequest.mockResolvedValue({
			ok: true,
			data: { id: "leave-1", status: "draft" },
		});
		const formData = new FormData();
		formData.set("entitlementId", "22222222-2222-4222-8222-222222222222");
		formData.set("startDate", "2026-08-01");
		formData.set("endDate", "2026-08-02");
		formData.set("requestedQuantity", "2");

		const result = await createOwnLeaveDraftAction(null, formData);

		expect(result.ok).toBe(true);
		expect(mocks.createDraftLeaveRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-self",
				actorUserId: "user-self",
				correlationId: "corr-self",
				employeeId,
				idempotencyKey: expect.any(String),
			}),
			{ kind: "hr-options" },
		);
		expect(mocks.revalidatePath).toHaveBeenCalledWith(
			"/client/human-resources",
		);
	});

	it("rejects timesheet and acknowledgement resources outside employee scope", async () => {
		mocks.getTimesheet.mockResolvedValue({
			ok: true,
			data: { employeeId: "33333333-3333-4333-8333-333333333333" },
		});
		const timesheet = new FormData();
		timesheet.set("timesheetId", "22222222-2222-4222-8222-222222222222");
		timesheet.set("expectedVersion", "1");
		expect((await submitOwnTimesheetAction(null, timesheet)).ok).toBe(false);
		expect(mocks.submitTimesheet).not.toHaveBeenCalled();

		mocks.getPolicyAcknowledgementById.mockResolvedValue({
			ok: true,
			data: {
				employeeId: "33333333-3333-4333-8333-333333333333",
				requirementStatus: "outstanding",
			},
		});
		const acknowledgement = new FormData();
		acknowledgement.set(
			"acknowledgementId",
			"44444444-4444-4444-8444-444444444444",
		);
		acknowledgement.set("expectedVersion", "1");
		expect((await acknowledgeOwnPolicyAction(null, acknowledgement)).ok).toBe(
			false,
		);
		expect(mocks.acknowledgePolicy).not.toHaveBeenCalled();
	});
});
