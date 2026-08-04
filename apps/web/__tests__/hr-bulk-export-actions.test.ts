import { errorResult } from "@afenda/errors";
import {
	type HumanResourcesReportingSourceCapability,
	runHumanResourcesBulkExport,
} from "@afenda/human-resources";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	createHumanResourcesBulkExportSource,
	HUMAN_RESOURCES_BULK_EXPORT_DEFINITIONS,
	HUMAN_RESOURCES_BULK_EXPORT_TYPES,
} from "../lib/erp/human-resources-bulk-export-registry";
import { createHumanResourcesBulkExportPorts } from "../lib/erp/human-resources-bulk-export-worker";

const operatorSession = {
	userId: "user-hr-export-operator",
	orgId: "org-hr-export-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({ requireRole: vi.fn() }));
const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));
const queueMocks = vi.hoisted(() => ({ enqueueExport: vi.fn() }));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { requireRole: authMocks.requireRole } },
}));
vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		createHumanResourcesBulkJobCapability: () => ({ kind: "test-store" }),
		enqueueHumanResourcesBulkExport: queueMocks.enqueueExport,
	};
});
vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-hr-export-test" } },
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

import { runHumanResourcesBulkExportAction } from "../app/actions/_runtime/hr-bulk-export";

describe("HR bulk export composition", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		queueMocks.enqueueExport.mockResolvedValue({
			ok: true,
			data: {
				id: "job-hr-export-attendance",
				organizationId: operatorSession.orgId,
				exportType: "attendance",
				idempotencyKey: "export-attendance-window",
				status: "queued",
				requestedFields: ["workDate"],
				dateFrom: "2026-07-01",
				dateTo: "2026-07-28",
				effectiveOn: null,
				createdBy: operatorSession.userId,
				createdAt: new Date("2026-07-28T00:00:00.000Z"),
				updatedAt: new Date("2026-07-28T00:00:00.000Z"),
			},
		});
	});

	it("registers all six source domains with definition-owned projections", () => {
		expect(Object.keys(HUMAN_RESOURCES_BULK_EXPORT_DEFINITIONS)).toEqual(
			HUMAN_RESOURCES_BULK_EXPORT_TYPES,
		);
		expect(HUMAN_RESOURCES_BULK_EXPORT_DEFINITIONS.compensation).toEqual(
			expect.objectContaining({
				requiredPermission: "human-resources.compensation.read",
				allowedFields: expect.not.arrayContaining([
					"confidentialNote",
					"fingerprint",
				]),
			}),
		);
	});

	it("denies at the Action gate before invoking the export worker", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await runHumanResourcesBulkExportAction({
			exportType: "compensation",
			idempotencyKey: "export-denied-compensation",
			requestedFields: ["annualizedAmount"],
		});

		expect(result.ok).toBe(false);
		expect(queueMocks.enqueueExport).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.compensation.read",
		);
	});

	it("stamps tenant, actor, and correlation and never accepts a client permission", async () => {
		const result = await runHumanResourcesBulkExportAction({
			exportType: "attendance",
			idempotencyKey: "export-attendance-window",
			requestedFields: ["workDate"],
			dateFrom: "2026-07-01",
			dateTo: "2026-07-28",
		});

		expect(result.ok).toBe(true);
		expect(queueMocks.enqueueExport).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-export-test",
				exportType: "attendance",
				idempotencyKey: "export-attendance-window",
				requestedFields: ["workDate"],
				dateFrom: "2026-07-01",
				dateTo: "2026-07-28",
				requiredPermission: "human-resources.time.attendance.read",
			},
			{ kind: "test-store" },
		);
	});

	it("rejects fields outside the definition before reading or recording evidence", async () => {
		const reporting: HumanResourcesReportingSourceCapability = {
			listFacts: vi.fn(async () =>
				errorResult.ok({ entries: [], total: 0, page: 1, pageSize: 200 }),
			),
		};
		const source = createHumanResourcesBulkExportSource("compensation", {
			reporting,
		});
		const authorize = vi.fn(async () => true);
		const recordPrivacyEvidence = vi.fn(async () =>
			errorResult.ok({ evidenceId: "should-not-exist" }),
		);

		const result = await runHumanResourcesBulkExport(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-non-disclosure",
				exportType: "compensation",
				requiredPermission: "human-resources.compensation.read",
				requestedFields: ["confidentialNote"],
			},
			HUMAN_RESOURCES_BULK_EXPORT_DEFINITIONS.compensation,
			source,
			{ authorize, recordPrivacyEvidence },
		);

		expect(result).toMatchObject({
			ok: false,
			code: "FORBIDDEN",
		});
		expect(reporting.listFacts).not.toHaveBeenCalled();
		expect(authorize).not.toHaveBeenCalled();
		expect(recordPrivacyEvidence).not.toHaveBeenCalled();
	});

	it("records platform privacy evidence without exported row values", async () => {
		const auditRecord = vi.fn(async () =>
			errorResult.ok({
				id: "audit-1",
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-evidence",
				module: "privacy",
				entity: "human_resources_bulk_export",
				entityId: "evidence-privacy-1",
				action: "EXPORT" as const,
				changes: [],
				oldValue: null,
				newValue: null,
				metadata: null,
				eventContext: null,
				ipAddress: null,
				userAgent: null,
				createdAt: new Date("2026-07-28T00:00:00.000Z"),
			}),
		);
		const ports = createHumanResourcesBulkExportPorts({
			authorization: { can: vi.fn(async () => true) },
			audit: { record: auditRecord },
			createEvidenceId: () => "evidence-privacy-1",
		});

		const evidence = await ports.recordPrivacyEvidence({
			organizationId: operatorSession.orgId,
			actorUserId: operatorSession.userId,
			correlationId: "corr-evidence",
			exportType: "attendance",
			fields: ["workDate", "workedMinutes"],
			rowCount: 2,
			dateFrom: "2026-07-01",
			dateTo: "2026-07-28",
			effectiveOn: null,
		});

		expect(evidence).toEqual({
			ok: true,
			data: { evidenceId: "evidence-privacy-1" },
		});
		expect(auditRecord).toHaveBeenCalledWith({
			organizationId: operatorSession.orgId,
			actorUserId: operatorSession.userId,
			correlationId: "corr-evidence",
			module: "privacy",
			entity: "human_resources_bulk_export",
			entityId: "evidence-privacy-1",
			action: "EXPORT",
			metadata: {
				sourceModuleId: "human-resources",
				exportType: "attendance",
				fields: ["workDate", "workedMinutes"],
				rowCount: 2,
				dateFrom: "2026-07-01",
				dateTo: "2026-07-28",
				effectiveOn: null,
			},
		});
		expect(JSON.stringify(auditRecord.mock.calls)).not.toContain(
			"employee-secret-value",
		);
	});
});
