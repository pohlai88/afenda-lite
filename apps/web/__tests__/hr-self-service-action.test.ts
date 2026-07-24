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
	recordClockIn: vi.fn(),
	recordClockOut: vi.fn(),
	recordBreakStart: vi.fn(),
	recordBreakEnd: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	getSession: mocks.getSession,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-self",
}));

vi.mock("@afenda/human-resources", () => ({
	recordClockIn: mocks.recordClockIn,
	recordClockOut: mocks.recordClockOut,
	recordBreakStart: mocks.recordBreakStart,
	recordBreakEnd: mocks.recordBreakEnd,
}));

vi.mock("next/cache", () => ({
	revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: mocks.forbidUnlessPermission,
}));

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({ kind: "hr-options" }),
}));

vi.mock("@/lib/erp/human-resources-identity-resolver-port", () => ({
	createHumanResourcesIdentityResolverPort: () => ({
		resolveEmployeeForActor: mocks.resolveEmployeeForActor,
	}),
}));

import { recordOwnAttendanceAction } from "../app/actions/hr-self-service";

describe("HR employee self-service attendance Action", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getSession.mockResolvedValue(session);
		mocks.forbidUnlessPermission.mockResolvedValue(null);
		mocks.resolveEmployeeForActor.mockResolvedValue({
			ok: true,
			data: {
				employeeId: "11111111-1111-4111-8111-111111111111",
				relationshipType: "self",
				effectiveFrom: "2026-01-01",
				effectiveUntil: null,
			},
		});
		mocks.recordClockIn.mockResolvedValue({
			ok: true,
			data: { id: "event-1" },
		});
	});

	it("derives organization, actor, and employee from the authenticated session", async () => {
		const formData = new FormData();
		formData.set("eventType", "clock-in");
		formData.set("timeZone", "Asia/Kuala_Lumpur");
		formData.set("employeeId", "22222222-2222-4222-8222-222222222222");

		const result = await recordOwnAttendanceAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: { eventId: "event-1", eventType: "clock-in" },
		});
		expect(mocks.forbidUnlessPermission).toHaveBeenCalledWith(
			session,
			"human-resources.time.attendance.self.record",
		);
		expect(mocks.resolveEmployeeForActor).toHaveBeenCalledWith({
			organizationId: "org-self",
			actorUserId: "user-self",
		});
		expect(mocks.recordClockIn).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-self",
				actorUserId: "user-self",
				employeeId: "11111111-1111-4111-8111-111111111111",
				correlationId: "corr-self",
				sourceTimezone: "Asia/Kuala_Lumpur",
			}),
			{ kind: "hr-options" },
		);
		expect(mocks.revalidatePath).toHaveBeenCalledWith(
			"/client/human-resources",
		);
	});

	it("rejects a timezone outside the allow-list before calling the domain", async () => {
		const formData = new FormData();
		formData.set("eventType", "clock-in");
		formData.set("timeZone", "Mars/Olympus_Mons");

		const result = await recordOwnAttendanceAction(null, formData);

		expect(result.ok).toBe(false);
		expect(mocks.resolveEmployeeForActor).not.toHaveBeenCalled();
		expect(mocks.recordClockIn).not.toHaveBeenCalled();
	});

	it("fails closed when the signed-in account has no employee mapping", async () => {
		mocks.resolveEmployeeForActor.mockResolvedValue({
			ok: true,
			data: null,
		});
		const formData = new FormData();
		formData.set("eventType", "clock-out");
		formData.set("timeZone", "UTC");

		const result = await recordOwnAttendanceAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Your account is not linked to an active employee record.",
		});
		expect(mocks.recordClockOut).not.toHaveBeenCalled();
	});
});
