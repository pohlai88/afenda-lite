import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

const { sessionHasPermission, redirect } = vi.hoisted(() => ({
	sessionHasPermission: vi.fn(),
	redirect: vi.fn(() => {
		throw new Error("redirected");
	}),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { paths: { forbidden: "/forbidden" } },
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/identity/domain/session-permission", () => ({
	sessionHasPermission,
}));

import { requireAnyPermission } from "../features/auth/require-permission";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string) {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("HR administration and manager workspace contracts", () => {
	it("admits a manager holding any workspace capability and fails closed otherwise", async () => {
		const session = {
			userId: "manager-user",
			orgId: "manager-org",
			role: "client" as const,
			email: "manager@example.com",
		};
		sessionHasPermission.mockImplementation(
			(_session, code: string) =>
				code === "human-resources.time.timesheet.approve",
		);
		await expect(
			requireAnyPermission(session, [
				"human-resources.employee.read",
				"human-resources.time.timesheet.approve",
			]),
		).resolves.toBeUndefined();
		expect(redirect).not.toHaveBeenCalled();

		sessionHasPermission.mockResolvedValue(false);
		await expect(
			requireAnyPermission(session, ["human-resources.employee.read"]),
		).rejects.toThrow("redirected");
		expect(redirect).toHaveBeenCalledWith("/forbidden");
	});

	it("mounts the complete admin record and manager workspaces", () => {
		const adminRoute = source("app/(operator)/admin/human-resources/page.tsx");
		const detailRoute = source(
			"app/(operator)/admin/human-resources/employees/[employeeId]/page.tsx",
		);
		const managerRoute = source(
			"app/(client)/client/(workspace)/human-resources/manager/page.tsx",
		);
		expect(adminRoute).toContain("EmployeeDirectoryWorkspace");
		expect(detailRoute).toContain("EmployeeAdminDetail");
		expect(detailRoute).toContain("humanResourcesEmployeeIdSchema.safeParse");
		expect(managerRoute).toContain("ManagerWorkspaceServer");
		expect(managerRoute).toContain("requireAnyPermission");
	});

	it("keeps manager decisions inside resolved team scope", () => {
		const journeys = source("app/actions/hr-manager-journeys.ts");
		for (const loader of [
			"getLeaveRequest",
			"getTimesheet",
			"getAttendanceException",
			"getProbationReview",
			"getPerformanceReviewById",
			"getTalentProfileByEmployee",
			"listSuccessionCandidates",
		]) {
			expect(journeys).toContain(loader);
		}
		expect(journeys).toContain("resolveManagerScope");
		expect(journeys.match(/isEmployeeInManagerScope/g)?.length).toBeGreaterThan(
			5,
		);
	});

	it("validates admin employee ownership before record mutations", () => {
		const journeys = source("app/actions/_runtime/hr-admin-journeys.ts");
		expect(journeys).toContain("loadOwnedEmployment");
		expect(journeys).toContain(
			"assignment.data.employeeId !== parsed.data.employeeId",
		);
		expect(journeys).toContain('errorResult.fail("NOT_FOUND"');
		expect(journeys).toContain("runOperatorPermissionAction");
	});
});
