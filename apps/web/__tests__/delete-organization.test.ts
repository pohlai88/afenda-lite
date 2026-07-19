/**
 * Org-console hard-delete Action — Result → ActionResult mapping + general audit.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-delete-operator",
	orgId: "org-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
	deleteOrganization: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
	recordOrganizationDeletedAudit: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@afenda/admin", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/admin")>();
	return {
		...actual,
		deleteOrganization: adminMocks.deleteOrganization,
	};
});

vi.mock("@/modules/platform/domain/record-organization-deleted-audit", () => ({
	recordOrganizationDeletedAudit: auditMocks.recordOrganizationDeletedAudit,
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { deleteOrganizationAction } from "../app/actions/delete-organization";

describe("deleteOrganizationAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		auditMocks.recordOrganizationDeletedAudit.mockResolvedValue({
			ok: true,
			data: { id: "audit-1" },
		});
	});

	it("returns VALIDATION_ERROR when orgId is missing", async () => {
		const formData = new FormData();
		const result = await deleteOrganizationAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(adminMocks.deleteOrganization).not.toHaveBeenCalled();
		expect(auditMocks.recordOrganizationDeletedAudit).not.toHaveBeenCalled();
	});

	it("maps package success to ActionResult ok, audits, and revalidates", async () => {
		adminMocks.deleteOrganization.mockResolvedValue({
			ok: true,
			data: { orgId: "org-to-delete" },
		});

		const formData = new FormData();
		formData.set("orgId", "org-to-delete");

		const result = await deleteOrganizationAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: { orgId: "org-to-delete" },
		});
		expect(adminMocks.deleteOrganization).toHaveBeenCalledWith({
			orgId: "org-to-delete",
		});
		expect(auditMocks.recordOrganizationDeletedAudit).toHaveBeenCalledWith({
			organizationId: "org-to-delete",
			actorUserId: operatorSession.userId,
			correlationId: expect.any(String),
		});
		expect(revalidatePath).toHaveBeenCalledWith("/admin");
	});

	it("does not audit when package returns FORBIDDEN", async () => {
		adminMocks.deleteOrganization.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Organization is not in the session memberships",
		});

		const formData = new FormData();
		formData.set("orgId", "org-outside");

		const result = await deleteOrganizationAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("FORBIDDEN");
			expect(result.message).toContain("session memberships");
		}
		expect(auditMocks.recordOrganizationDeletedAudit).not.toHaveBeenCalled();
		expect(revalidatePath).not.toHaveBeenCalled();
	});

	it("returns INTERNAL_ERROR when audit write fails after Neon delete", async () => {
		adminMocks.deleteOrganization.mockResolvedValue({
			ok: true,
			data: { orgId: "org-to-delete" },
		});
		auditMocks.recordOrganizationDeletedAudit.mockResolvedValue({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed to write audit entry",
		});

		const formData = new FormData();
		formData.set("orgId", "org-to-delete");

		const result = await deleteOrganizationAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("INTERNAL_ERROR");
			expect(result.message).toMatch(/activity audit/i);
		}
		expect(revalidatePath).not.toHaveBeenCalled();
	});

	it("pins hard-delete + general audit SSOT (not RBAC audit)", async () => {
		const { readFileSync } = await import("node:fs");
		const path = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const webRoot = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			"..",
		);
		const action = readFileSync(
			path.join(webRoot, "app/actions/delete-organization.ts"),
			"utf8",
		);
		const domain = readFileSync(
			path.join(
				webRoot,
				"modules/platform/domain/record-organization-deleted-audit.ts",
			),
			"utf8",
		);
		expect(action).toMatch(/hard-delete/i);
		expect(action).toMatch(/Permanent removal only/i);
		expect(action).toContain('from "@afenda/admin"');
		expect(action).toContain("recordOrganizationDeletedAudit");
		expect(action).toContain("platform_audit_log");
		expect(action).not.toContain("recordRbacAudit");
		expect(action).not.toContain('from "@afenda/audit"');
		expect(domain).toContain('from "@afenda/audit"');
		expect(domain).toContain("createAuditRecorder");
		expect(domain).not.toContain("recordRbacAudit");
	});
});
