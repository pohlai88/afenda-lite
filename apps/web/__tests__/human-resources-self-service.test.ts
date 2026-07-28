import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

const { sessionHasPermission } = vi.hoisted(() => ({
	sessionHasPermission: vi.fn(),
}));

vi.mock("@/modules/identity/domain/session-permission", () => ({
	sessionHasPermission,
}));

import {
	hasSelfServiceCapability,
	resolveSelfServicePermissions,
} from "../features/human-resources/self-service/self-service-permissions";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string) {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("Human Resources employee self-service workspace contract", () => {
	it("mounts the identity-scoped workspace from the thin client route", () => {
		const route = source(
			"app/(client)/client/(workspace)/human-resources/page.tsx",
		);
		const server = source(
			"features/human-resources/self-service/self-service-workspace-server.tsx",
		);

		expect(route).toContain("SelfServiceWorkspaceServer");
		expect(route).not.toContain("EmployeeHrShell");
		expect(server).toContain("resolveEmployeeForActor");
		expect(server).toContain("forbidPermissionAccess");
		expect(server).not.toContain("employeeId: string");
	});

	it("composes every Phase 11.2 capability from the UI flat barrel", () => {
		const workspace = source(
			"features/human-resources/self-service/self-service-workspace.tsx",
		);
		for (const label of [
			"Profile",
			"Leave",
			"Attendance",
			"Timesheet",
			"Learning",
			"Goals & reviews",
			"Documents",
			"Policy acknowledgements",
		]) {
			expect(workspace).toContain(label);
		}
		expect(workspace).toContain('from "@afenda/ui-system"');
		expect(workspace).not.toMatch(/@afenda\/ui-system\//);
	});

	it("fails the route capability gate when every ESS permission is denied", async () => {
		sessionHasPermission.mockResolvedValue(false);
		const permissions = await resolveSelfServicePermissions({
			userId: "user-self",
			orgId: "org-self",
			role: "client",
		});

		expect(hasSelfServiceCapability(permissions)).toBe(false);
		expect(Object.values(permissions).every((allowed) => !allowed)).toBe(true);
	});

	it("requires the complete leave read set before exposing leave journeys", async () => {
		sessionHasPermission.mockImplementation(
			(_session, code: string) => code === "human-resources.leave-request.own",
		);
		const permissions = await resolveSelfServicePermissions({
			userId: "user-self",
			orgId: "org-self",
			role: "client",
		});

		expect(permissions.canViewLeave).toBe(false);
	});
});
