/**
 * Platform domain adapter — org hard-delete → `@afenda/audit`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const auditMocks = vi.hoisted(() => ({
	record: vi.fn(),
}));

const attributionMocks = vi.hoisted(() => ({
	readRequestAttribution: vi.fn(),
}));

vi.mock("@afenda/audit", () => ({
	createAuditRecorder: () => ({
		record: auditMocks.record,
	}),
}));

vi.mock("@/modules/platform/domain/request-attribution", () => ({
	readRequestAttribution: attributionMocks.readRequestAttribution,
}));

import { recordOrganizationDeletedAudit } from "../modules/platform/domain/record-organization-deleted-audit";

describe("recordOrganizationDeletedAudit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		attributionMocks.readRequestAttribution.mockResolvedValue({
			ipAddress: "203.0.113.10",
			userAgent: "vitest",
		});
		auditMocks.record.mockResolvedValue({
			ok: true,
			data: { id: "audit-1" },
		});
	});

	it("stamps DELETE organization command with request attribution", async () => {
		const result = await recordOrganizationDeletedAudit({
			organizationId: "org-to-delete",
			actorUserId: "user-1",
			correlationId: "corr-1",
		});

		expect(result.ok).toBe(true);
		expect(auditMocks.record).toHaveBeenCalledWith({
			organizationId: "org-to-delete",
			actorUserId: "user-1",
			correlationId: "corr-1",
			module: "platform",
			entity: "organization",
			entityId: "org-to-delete",
			action: "DELETE",
			oldValue: { orgId: "org-to-delete" },
			newValue: null,
			ipAddress: "203.0.113.10",
			userAgent: "vitest",
		});
	});

	it("forwards recorder Result failures", async () => {
		auditMocks.record.mockResolvedValue({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed to write audit entry",
		});

		const result = await recordOrganizationDeletedAudit({
			organizationId: "org-to-delete",
			actorUserId: "user-1",
			correlationId: "corr-1",
		});

		expect(result).toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed to write audit entry",
		});
	});
});
