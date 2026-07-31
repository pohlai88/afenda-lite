import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	sessionHasPermission: vi.fn(),
	listRequisitions: vi.fn(),
	listCandidates: vi.fn(),
	listApplications: vi.fn(),
	listInterviews: vi.fn(),
	listOffers: vi.fn(),
}));

vi.mock("@/modules/identity/domain/session-permission", () => ({
	sessionHasPermission: mocks.sessionHasPermission,
}));
vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-recruitment" } },
}));
vi.mock("@afenda/human-resources", () => ({
	listRequisitions: mocks.listRequisitions,
	listCandidates: mocks.listCandidates,
	listApplications: mocks.listApplications,
	listInterviews: mocks.listInterviews,
	listOffers: mocks.listOffers,
}));
vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({ kind: "hr-options" }),
}));

import { loadRecruitmentWorkspace } from "../features/human-resources/recruitment/load-recruitment-workspace";
import {
	hasRecruitmentCapability,
	resolveRecruitmentCapabilities,
} from "../features/human-resources/recruitment/recruitment-permissions";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath: string) =>
	readFileSync(path.join(webRoot, relativePath), "utf8");

const capabilities = {
	canManageRequisitions: true,
	canManageCandidates: true,
	canReadInterviews: true,
	canRecordInterviews: true,
	canManageOffers: true,
	canHire: true,
};

beforeEach(() => {
	vi.clearAllMocks();
	for (const fn of [
		mocks.listRequisitions,
		mocks.listCandidates,
		mocks.listApplications,
		mocks.listInterviews,
		mocks.listOffers,
	]) {
		fn.mockResolvedValue({
			ok: true,
			data: {
				requisitions: [],
				candidates: [],
				applications: [],
				interviews: [],
				offers: [],
			},
		});
	}
});

describe("Human Resources recruitment workspace", () => {
	it("mounts the canonical route and preserves the candidate directory", () => {
		const route = source(
			"app/(operator)/admin/human-resources/recruitment/page.tsx",
		);
		const workspace = source(
			"features/human-resources/recruitment/recruitment-workspace.tsx",
		);

		expect(route).toContain("RecruitmentWorkspaceServer");
		expect(workspace).toContain("/admin/human-resources/candidates");
		for (const journey of [
			"Requisitions",
			"Pipeline",
			"Interviews",
			"Offers",
			"Consent",
			"Hire conversion",
		]) {
			expect(workspace).toContain(journey);
		}
		expect(workspace).toContain('from "@afenda/ui-system"');
		expect(workspace).not.toMatch(/@afenda\/ui-system\//);
	});

	it("fails the workspace gate when no recruitment permission is assigned", async () => {
		mocks.sessionHasPermission.mockResolvedValue(false);
		const resolved = await resolveRecruitmentCapabilities({
			userId: "user-recruiter",
			orgId: "org-a",
			role: "operator",
		});
		expect(hasRecruitmentCapability(resolved)).toBe(false);
	});

	it("stamps tenant and actor on every enabled package query", async () => {
		await loadRecruitmentWorkspace({
			organizationId: "org-a",
			actorUserId: "user-recruiter",
			capabilities,
		});
		for (const fn of [
			mocks.listRequisitions,
			mocks.listCandidates,
			mocks.listApplications,
			mocks.listInterviews,
			mocks.listOffers,
		]) {
			expect(fn).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: "org-a",
					actorUserId: "user-recruiter",
					correlationId: "corr-recruitment",
				}),
				{ kind: "hr-options" },
			);
		}
	});

	it("fails closed when a candidate query returns another tenant", async () => {
		mocks.listCandidates.mockResolvedValue({
			ok: true,
			data: {
				candidates: [
					{
						id: "candidate-foreign",
						organizationId: "org-b",
					},
				],
			},
		});

		const result = await loadRecruitmentWorkspace({
			organizationId: "org-a",
			actorUserId: "user-recruiter",
			capabilities,
		});
		expect(result.candidates).toEqual([]);
		expect(result.errors.candidates).toBeDefined();
	});
});
