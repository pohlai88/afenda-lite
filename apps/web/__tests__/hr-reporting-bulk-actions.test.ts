import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-reporting-operator",
	orgId: "org-hr-reporting-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({ requireRole: vi.fn() }));
const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));
const workerMocks = vi.hoisted(() => ({
	buildSnapshot: vi.fn(),
	runEmployee: vi.fn(),
	runAssignment: vi.fn(),
	runLeaveEntitlement: vi.fn(),
	runAttendance: vi.fn(),
	runCompensation: vi.fn(),
	runLearningAssignment: vi.fn(),
	loadStatus: vi.fn(),
	loadErrorArtifact: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({ requireRole: authMocks.requireRole }));
vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-reporting-test",
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));
vi.mock("@/lib/erp/human-resources-reporting-bulk-worker", () => ({
	buildHumanResourcesReportingSnapshotWorker: workerMocks.buildSnapshot,
	runEmployeeBulkImportWorker: workerMocks.runEmployee,
	runAssignmentBulkImportWorker: workerMocks.runAssignment,
	runLeaveEntitlementBulkImportWorker: workerMocks.runLeaveEntitlement,
	runAttendanceBulkImportWorker: workerMocks.runAttendance,
	runCompensationBulkImportWorker: workerMocks.runCompensation,
	runLearningAssignmentBulkImportWorker: workerMocks.runLearningAssignment,
	loadHumanResourcesBulkStatusWorker: workerMocks.loadStatus,
	loadHumanResourcesBulkErrorArtifactWorker: workerMocks.loadErrorArtifact,
}));

import {
	buildHumanResourcesReportingSnapshotAction,
	loadHumanResourcesBulkErrorArtifactAction,
	runEmployeeBulkImportAction,
} from "../app/actions/hr-reporting-bulk";

describe("HR reporting and bulk Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		workerMocks.buildSnapshot.mockResolvedValue({
			ok: true,
			data: { meta: { organizationId: operatorSession.orgId } },
		});
		workerMocks.loadErrorArtifact.mockResolvedValue({
			ok: true,
			data: null,
		});
	});

	it("denies reporting before invoking the reporting worker", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await buildHumanResourcesReportingSnapshotAction({
			asOf: "2026-07-28",
			periodStart: "2026-07-01",
			periodEnd: "2026-07-28",
		});

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});
		expect(workerMocks.buildSnapshot).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employee.read",
		);
	});

	it("stamps reporting organization, actor, and correlation server-side", async () => {
		const result = await buildHumanResourcesReportingSnapshotAction({
			asOf: "2026-07-28",
			periodStart: "2026-07-01",
			periodEnd: "2026-07-28",
		});

		expect(result.ok).toBe(true);
		expect(workerMocks.buildSnapshot).toHaveBeenCalledWith({
			organizationId: operatorSession.orgId,
			actorUserId: operatorSession.userId,
			correlationId: "corr-hr-reporting-test",
			asOf: "2026-07-28",
			periodStart: "2026-07-01",
			periodEnd: "2026-07-28",
		});
	});

	it("denies source bulk execution before validation or worker invocation", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await runEmployeeBulkImportAction({
			batchId: "00000000-0000-4000-8000-000000000010",
			mode: "commit",
			idempotencyKey: "employee-import-1",
			rows: [],
		});

		expect(result.ok).toBe(false);
		expect(workerMocks.runEmployee).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employee.create",
		);
	});

	it("protects persisted rejection artifacts with privacy export permission and tenant scope", async () => {
		const result = await loadHumanResourcesBulkErrorArtifactAction({
			idempotencyKey: "employee-import-1",
		});

		expect(result).toEqual({ ok: true, data: { artifact: null } });
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.privacy.export",
		);
		expect(workerMocks.loadErrorArtifact).toHaveBeenCalledWith({
			organizationId: operatorSession.orgId,
			idempotencyKey: "employee-import-1",
		});
	});
});
