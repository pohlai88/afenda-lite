import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
	SelfServicePermissions,
	SelfServiceSnapshot,
} from "@/features/human-resources/self-service/types";

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	redirect: vi.fn(),
	sessionHasPermission: vi.fn(),
	resolveEmployeeForActor: vi.fn(),
	loadSelfServiceSnapshot: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: {
		session: { get: mocks.getSession },
		paths: { forbidden: "/forbidden" },
	},
}));

vi.mock("next/navigation", () => ({
	redirect: mocks.redirect,
}));

vi.mock("@/modules/identity/domain/session-permission", () => ({
	sessionHasPermission: mocks.sessionHasPermission,
}));

vi.mock("@/lib/erp/human-resources-identity-resolver-port", () => ({
	createHumanResourcesIdentityResolverPort: () => ({
		resolveEmployeeForActor: mocks.resolveEmployeeForActor,
	}),
}));

vi.mock("@/features/human-resources/self-service/load-self-service", () => ({
	loadSelfServiceSnapshot: mocks.loadSelfServiceSnapshot,
}));

import { SelfServiceWorkspace } from "@/features/human-resources/self-service/self-service-workspace";
import { SelfServiceWorkspaceServer } from "@/features/human-resources/self-service/self-service-workspace-server";

const permissions: SelfServicePermissions = {
	canViewProfile: true,
	canViewLeave: true,
	canViewAttendance: true,
	canViewTimesheet: true,
	canViewLearning: true,
	canViewCertifications: true,
	canViewPerformance: true,
	canViewDocuments: true,
	canViewAcknowledgements: true,
	canRecordAttendance: true,
	canCancelApprovedLeave: true,
	canSubmitTimesheet: true,
	canAcknowledgePolicy: true,
};

const snapshot: SelfServiceSnapshot = {
	profile: {
		name: "Amina Employee",
		preferredName: "Amina",
		employeeNumber: "EMP-001",
		employmentStatus: "active",
		workerStatus: "active",
		phone: "+60123456789",
	},
	leaveBalances: [
		{
			entitlementId: "11111111-1111-4111-8111-111111111111",
			policyName: "Annual leave",
			balance: "12",
			unit: "days",
			periodStart: "2026-01-01",
			periodEnd: "2026-12-31",
		},
	],
	leaveRequests: [],
	attendance: {
		currentStatus: "Clocked out",
		events: [],
		sessions: [],
	},
	timesheet: {
		id: "22222222-2222-4222-8222-222222222222",
		periodStart: "2026-07-01",
		periodEnd: "2026-07-31",
		status: "draft",
		version: 1,
		recordedMinutes: 480,
		approvedMinutes: 0,
		entries: [],
	},
	learning: {
		assignments: [
			{
				id: "assignment-1",
				course: "Safety",
				dueOn: "2026-08-01",
				status: "assigned",
			},
		],
		certifications: [],
	},
	performance: {
		goals: [
			{
				id: "goal-1",
				title: "Service quality",
				periodStart: "2026-01-01",
				periodEnd: "2026-12-31",
				status: "active",
			},
		],
		reviews: [],
	},
	compliance: {
		summary: {
			missingDocuments: 0,
			expiringDocuments: 0,
			workEligibilityAtRisk: false,
			outstandingAcknowledgements: 1,
		},
		documents: [],
		acknowledgements: [
			{
				id: "33333333-3333-4333-8333-333333333333",
				policyCode: "CODE-OF-CONDUCT",
				policyVersion: "2026.1",
				dueOn: "2026-08-01",
				version: 1,
			},
		],
	},
	errors: {},
};

const preferences = {
	locale: "en" as const,
	timeZone: "Asia/Kuala_Lumpur" as const,
};

afterEach(cleanup);

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getSession.mockResolvedValue({
		userId: "user-self",
		orgId: "org-self",
		role: "client",
		email: "employee@example.com",
	});
	mocks.sessionHasPermission.mockResolvedValue(true);
	mocks.resolveEmployeeForActor.mockResolvedValue({
		ok: true,
		data: {
			employeeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			relationshipType: "self",
			effectiveFrom: "2026-01-01",
			effectiveUntil: null,
		},
	});
	mocks.loadSelfServiceSnapshot.mockResolvedValue(snapshot);
	mocks.redirect.mockImplementation(() => {
		throw new Error("FORBIDDEN_REDIRECT");
	});
});

describe("Human Resources employee self-service workspace", () => {
	it("renders every authorized ESS capability without accepting an employee id", async () => {
		const user = userEvent.setup();
		render(
			<SelfServiceWorkspace
				permissions={permissions}
				preferences={preferences}
				snapshot={snapshot}
			/>,
		);

		expect(
			screen.getByRole("heading", { name: "My employee workspace" }),
		).toBeTruthy();
		for (const tab of [
			"Profile",
			"Leave",
			"Attendance",
			"Timesheet",
			"Learning",
			"Goals & reviews",
			"Documents",
		]) {
			expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
		}

		await user.click(screen.getByRole("tab", { name: "Leave" }));
		expect(
			screen.getByRole("heading", { name: "Leave balances" }),
		).toBeTruthy();
		await user.click(screen.getByRole("tab", { name: "Timesheet" }));
		expect(
			screen.getByRole("button", { name: "Submit timesheet" }),
		).toBeTruthy();
		await user.click(screen.getByRole("tab", { name: "Documents" }));
		expect(screen.getByText("CODE-OF-CONDUCT · version 2026.1")).toBeTruthy();
		expect(document.querySelector('input[name="employeeId"]')).toBeNull();
	});

	it("resolves the employee from the signed-in tenant before loading data", async () => {
		const element = await SelfServiceWorkspaceServer({
			page: 2,
			preferences,
		});
		render(element);

		expect(mocks.resolveEmployeeForActor).toHaveBeenCalledWith({
			organizationId: "org-self",
			actorUserId: "user-self",
		});
		expect(mocks.loadSelfServiceSnapshot).toHaveBeenCalledWith({
			organizationId: "org-self",
			actorUserId: "user-self",
			employeeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			page: 2,
		});
	});

	it("fails closed before loading data when employee identity is absent", async () => {
		mocks.resolveEmployeeForActor.mockResolvedValue({ ok: true, data: null });

		await expect(
			SelfServiceWorkspaceServer({ page: 1, preferences }),
		).rejects.toThrow("FORBIDDEN_REDIRECT");
		expect(mocks.redirect).toHaveBeenCalledWith("/forbidden");
		expect(mocks.loadSelfServiceSnapshot).not.toHaveBeenCalled();
	});

	it("fails closed before identity lookup when no ESS permission is granted", async () => {
		mocks.sessionHasPermission.mockResolvedValue(false);

		await expect(
			SelfServiceWorkspaceServer({ page: 1, preferences }),
		).rejects.toThrow("FORBIDDEN_REDIRECT");
		expect(mocks.resolveEmployeeForActor).not.toHaveBeenCalled();
	});
});
