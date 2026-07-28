import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	sessionHasPermission: vi.fn(),
	listGrades: vi.fn(),
	listCycles: vi.fn(),
}));
vi.mock("@/modules/identity/domain/session-permission", () => ({
	sessionHasPermission: mocks.sessionHasPermission,
}));
vi.mock("@/app/actions/hr-compensation", () => ({
	listCompensationGradesAction: mocks.listGrades,
}));
vi.mock("@/app/actions/hr-compensation-review", () => ({
	listCompensationReviewCyclesAction: mocks.listCycles,
}));

import {
	hasCompensationCapability,
	resolveCompensationCapabilities,
} from "../features/human-resources/compensation/compensation-permissions";
import { loadCompensationWorkspace } from "../features/human-resources/compensation/load-compensation-workspace";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath: string) =>
	readFileSync(path.join(root, relativePath), "utf8");
const denied = { canRead: false, canManage: false, canManageBenefits: false };

beforeEach(() => {
	vi.clearAllMocks();
	mocks.listGrades.mockResolvedValue({
		ok: true,
		data: { page: { grades: [] } },
	});
	mocks.listCycles.mockResolvedValue({
		ok: true,
		data: { page: { cycles: [] } },
	});
});

describe("Human Resources compensation workspace", () => {
	it("mounts the canonical route and all required compensation areas", () => {
		const route = source(
			"app/(operator)/admin/human-resources/compensation/page.tsx",
		);
		const workspace = source(
			"features/human-resources/compensation/compensation-workspace.tsx",
		);
		expect(route).toContain("CompensationWorkspaceServer");
		for (const area of [
			"Grades",
			"Bands",
			"Reviews",
			"Benefits",
			"Employee history",
			"Payroll handoff",
		])
			expect(workspace).toContain(area);
		expect(workspace).toContain('from "@afenda/ui-system"');
		expect(workspace).not.toMatch(/@afenda\/ui-system\//);
	});

	it("fails closed without a compensation or benefits permission", async () => {
		mocks.sessionHasPermission.mockResolvedValue(false);
		const capabilities = await resolveCompensationCapabilities({
			userId: "user-a",
			orgId: "org-a",
			role: "operator",
		});
		expect(capabilities).toEqual(denied);
		expect(hasCompensationCapability(capabilities)).toBe(false);
	});

	it("does not execute sensitive queries for a benefits-only operator", async () => {
		const data = await loadCompensationWorkspace({
			...denied,
			canManageBenefits: true,
		});
		expect(data).toEqual({ grades: [], reviewCycles: [], errors: {} });
		expect(mocks.listGrades).not.toHaveBeenCalled();
		expect(mocks.listCycles).not.toHaveBeenCalled();
	});

	it("loads grades and reviews for a compensation reader", async () => {
		await loadCompensationWorkspace({ ...denied, canRead: true });
		expect(mocks.listGrades).toHaveBeenCalledOnce();
		expect(mocks.listCycles).toHaveBeenCalledOnce();
	});
});
