import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	sessionHasPermission: vi.fn(),
	listMissing: vi.fn(),
	listExpiring: vi.fn(),
	listCases: vi.fn(),
	listPlans: vi.fn(),
}));

vi.mock("@/modules/identity/domain/session-permission", () => ({
	sessionHasPermission: mocks.sessionHasPermission,
}));
vi.mock("@/app/actions/hr-compliance", () => ({
	listMissingRequiredDocumentsAction: mocks.listMissing,
	listExpiringEmployeeDocumentsAction: mocks.listExpiring,
}));
vi.mock("@/app/actions/hr-employee-relations", () => ({
	listOpenEmployeeRelationsCasesAction: mocks.listCases,
}));
vi.mock("@/app/actions/hr-workforce-planning", () => ({
	listHeadcountPlansAction: mocks.listPlans,
}));

import {
	hasHrOperationsCapability,
	resolveHrOperationsCapabilities,
} from "../features/human-resources/operations/hr-operations-permissions";
import { loadHrOperations } from "../features/human-resources/operations/load-hr-operations";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath: string) =>
	readFileSync(path.join(webRoot, relativePath), "utf8");

const noCapabilities = {
	canOnboard: false,
	canOffboard: false,
	canManageEmployment: false,
	canAdministerCompliance: false,
	canOpenCases: false,
	canReadCases: false,
	canReadWorkforcePlans: false,
	canPrepareWorkforcePlans: false,
	canViewIntegrationHealth: false,
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.listMissing.mockResolvedValue({
		ok: true,
		data: { page: { requirements: [] } },
	});
	mocks.listExpiring.mockResolvedValue({
		ok: true,
		data: { page: { documents: [] } },
	});
	mocks.listCases.mockResolvedValue({
		ok: true,
		data: { page: { cases: [] } },
	});
	mocks.listPlans.mockResolvedValue({
		ok: true,
		data: { page: { plans: [] } },
	});
});

describe("Human Resources operations workspace", () => {
	it("mounts the canonical route and preserves integration health as a subsurface", () => {
		const route = source(
			"app/(operator)/admin/human-resources/operations/page.tsx",
		);
		const server = source(
			"features/human-resources/operations/hr-operations-workspace-server.tsx",
		);
		const workspace = source(
			"features/human-resources/operations/hr-operations-workspace.tsx",
		);
		expect(route).toContain("HrOperationsWorkspaceServer");
		expect(server).toContain("OperationsHrShell");
		for (const area of [
			"Lifecycle",
			"Compliance",
			"Employee relations",
			"Workforce planning",
			"Integration health",
		]) {
			expect(workspace).toContain(area);
		}
		expect(workspace).toContain('from "@afenda/ui-system"');
		expect(workspace).not.toMatch(/@afenda\/ui-system\//);
	});

	it("fails the workspace gate when no operations permission is assigned", async () => {
		mocks.sessionHasPermission.mockResolvedValue(false);
		const resolved = await resolveHrOperationsCapabilities({
			userId: "user-hr",
			orgId: "org-a",
			role: "operator",
		});
		expect(resolved).toEqual(noCapabilities);
		expect(hasHrOperationsCapability(resolved)).toBe(false);
	});

	it("does not execute queries for unauthorized operations surfaces", async () => {
		const result = await loadHrOperations(noCapabilities);
		expect(result).toEqual({
			missingRequirements: [],
			expiringDocuments: [],
			cases: [],
			plans: [],
			errors: {},
		});
		expect(mocks.listMissing).not.toHaveBeenCalled();
		expect(mocks.listExpiring).not.toHaveBeenCalled();
		expect(mocks.listCases).not.toHaveBeenCalled();
		expect(mocks.listPlans).not.toHaveBeenCalled();
	});

	it("loads only the queues authorized for the operator", async () => {
		await loadHrOperations({
			...noCapabilities,
			canAdministerCompliance: true,
			canReadCases: true,
		});
		expect(mocks.listMissing).toHaveBeenCalledOnce();
		expect(mocks.listExpiring).toHaveBeenCalledOnce();
		expect(mocks.listCases).toHaveBeenCalledOnce();
		expect(mocks.listPlans).not.toHaveBeenCalled();
	});
});
