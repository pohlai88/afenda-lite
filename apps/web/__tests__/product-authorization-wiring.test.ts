import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-n11",
	orgId: "org-n11",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	getApiSession: vi.fn(),
	requireRole: vi.fn(),
	roleSatisfies: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
	redirect: vi.fn((path: string) => {
		throw new Error(`NEXT_REDIRECT:${path}`);
	}),
}));

vi.mock("@afenda/auth", () => ({
	AUTH_FORBIDDEN_PATH: "/403",
	getApiSession: authMocks.getApiSession,
	requireRole: authMocks.requireRole,
	roleSatisfies: authMocks.roleSatisfies,
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/identity/domain/has-permission", () => ({
	hasPermission: vi.fn(),
}));

import { forbidUnlessPermission } from "../app/actions/permission-gate";
import { requirePermission } from "../features/auth/require-permission";
import { hasPermission } from "../modules/identity/domain/has-permission";
import {
	PERMISSION_DENIED_MESSAGE,
	sessionHasPermission,
} from "../modules/identity/domain/session-permission";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const hasPermissionMock = vi.mocked(hasPermission);

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("N11 product authorization wiring", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(session);
		authMocks.getApiSession.mockResolvedValue(session);
		authMocks.roleSatisfies.mockReturnValue(true);
	});

	it("binds permission evaluation to the authenticated organization and user", async () => {
		hasPermissionMock.mockResolvedValue(true);

		await expect(
			sessionHasPermission(session, "org.roles.manage"),
		).resolves.toBe(true);
		expect(hasPermissionMock).toHaveBeenCalledWith({
			orgId: "org-n11",
			userId: "user-n11",
			code: "org.roles.manage",
			bootstrapRole: "operator",
		});
	});

	it("returns the shared FORBIDDEN action shape when a code is unassigned", async () => {
		hasPermissionMock.mockResolvedValue(false);

		await expect(
			forbidUnlessPermission(session, "org.roles.manage"),
		).resolves.toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: PERMISSION_DENIED_MESSAGE["org.roles.manage"],
		});
	});

	it("allows the shared action gate only when the code is granted", async () => {
		hasPermissionMock.mockResolvedValue(true);
		await expect(
			forbidUnlessPermission(session, "org.roles.manage"),
		).resolves.toBeNull();
	});

	it("redirects denied RSC reads through the governed forbidden path", async () => {
		hasPermissionMock.mockResolvedValue(false);

		await expect(requirePermission(session, "clients.invite")).rejects.toThrow(
			"NEXT_REDIRECT:/403",
		);
		expect(navigationMocks.redirect).toHaveBeenCalledWith("/403");
	});

	it("pins org-console Actions to requireRole('operator') + package SSOT", () => {
		const orgConsoleActions = [
			"app/actions/provision-organization.ts",
			"app/actions/delete-organization.ts",
			"app/actions/get-organization-usage.ts",
		] as const;
		for (const relativePath of orgConsoleActions) {
			const portSource = source(relativePath);
			expect(portSource, `${relativePath} must requireRole operator`).toContain(
				'requireRole("operator")',
			);
			expect(portSource, `${relativePath} must map package Result`).toContain(
				"mapPackageResult",
			);
		}
		expect(source("app/actions/provision-organization.ts")).toContain(
			'from "@afenda/admin"',
		);
		expect(source("app/actions/delete-organization.ts")).toContain(
			'from "@afenda/admin"',
		);
		expect(source("app/actions/get-organization-usage.ts")).toContain(
			'from "@afenda/admin/usage"',
		);
		expect(source("app/actions/get-organization-usage.ts")).not.toMatch(
			/from ["']@afenda\/admin["']/,
		);
	});

	it("pins every living product port to its ARCH-023 v1 code", () => {
		const expectedCodesByPort = {
			"app/actions/assign-org-role.ts": ["org.roles.manage"],
			"app/actions/revoke-org-role.ts": ["org.roles.manage"],
			"app/actions/invite-org-member.ts": ["clients.invite"],
			"app/actions/list-parties.ts": ["master_data.read"],
			"app/actions/create-party.ts": ["master_data.manage"],
			"app/actions/activate-party.ts": ["master_data.manage"],
			"app/actions/merge-parties.ts": ["master_data.manage"],
			"app/actions/create-party-role.ts": ["master_data.manage"],
			"app/actions/list-payment-terms.ts": ["master_data.read"],
			"app/actions/create-payment-term.ts": ["master_data.manage"],
			"app/actions/update-payment-term.ts": ["master_data.manage"],
			"app/actions/payment-term-lifecycle.ts": ["master_data.manage"],
			"app/actions/list-tax-registrations.ts": ["master_data.read"],
			"app/actions/create-tax-registration.ts": ["master_data.manage"],
			"app/actions/update-tax-registration.ts": ["master_data.manage"],
			"app/actions/tax-registration-lifecycle.ts": ["master_data.manage"],
			"app/actions/submit-change-request.ts": ["master_data.manage"],
			"app/actions/approve-change-request.ts": ["master_data.approve"],
			"app/actions/reject-change-request.ts": ["master_data.approve"],
			"app/actions/validate-master-data-import.ts": ["master_data.manage"],
			"app/actions/apply-master-data-import.ts": ["master_data.import_approve"],
			"app/actions/list-sales-orders.ts": ["sales.read"],
			"app/actions/get-sales-order.ts": ["sales.read"],
			"app/actions/create-sales-order.ts": ["sales.manage"],
			"app/actions/add-sales-order-line.ts": ["sales.manage"],
			"app/actions/post-sales-order.ts": ["sales.manage"],
			"app/actions/list-purchase-orders.ts": ["purchasing.read"],
			"app/actions/get-purchase-order.ts": ["purchasing.read"],
			"app/actions/create-purchase-order.ts": ["purchasing.manage"],
			"app/actions/add-purchase-order-line.ts": ["purchasing.manage"],
			"app/actions/post-purchase-order.ts": ["purchasing.manage"],
			"app/actions/cancel-purchase-order.ts": ["purchasing.manage"],
			"features/org-admin/org-admin-shell.tsx": [
				"org.roles.manage",
				"clients.invite",
			],
			"features/master-data/master-data-shell.tsx": [
				"master_data.read",
				"master_data.manage",
				"master_data.approve",
			],
			"features/sales/sales-shell.tsx": ["sales.read", "sales.manage"],
			"features/purchasing/purchasing-shell.tsx": [
				"purchasing.read",
				"purchasing.manage",
			],
		} as const;

		for (const [relativePath, codes] of Object.entries(expectedCodesByPort)) {
			const portSource = source(relativePath);
			for (const code of codes) {
				expect(portSource, `${relativePath} must enforce ${code}`).toContain(
					code,
				);
			}
		}

		for (const relativePath of [
			"app/actions/activate-payment-term.ts",
			"app/actions/inactive-payment-term.ts",
			"app/actions/retire-payment-term.ts",
		]) {
			expect(
				source(relativePath),
				`${relativePath} must delegate to shared lifecycle runner`,
			).toContain("runPaymentTermLifecycle");
		}

		for (const relativePath of [
			"app/actions/activate-tax-registration.ts",
			"app/actions/block-tax-registration.ts",
			"app/actions/retire-tax-registration.ts",
			"app/actions/restore-tax-registration.ts",
		]) {
			expect(
				source(relativePath),
				`${relativePath} must delegate to shared lifecycle runner`,
			).toContain("runTaxRegistrationLifecycle");
		}
	});

	it("keeps RSC denial and living mutations on the shared gates", () => {
		expect(source("features/org-admin/org-admin-shell.tsx")).toContain(
			"forbidPermissionAccess",
		);
		expect(source("features/org-admin/org-admin-shell.tsx")).toContain(
			'requireRole("operator")',
		);
		for (const relativePath of [
			"app/actions/assign-org-role.ts",
			"app/actions/revoke-org-role.ts",
			"app/actions/invite-org-member.ts",
			"app/actions/create-party.ts",
			"app/actions/create-party-role.ts",
			"app/actions/activate-party.ts",
			"app/actions/merge-parties.ts",
			"app/actions/list-parties.ts",
			"app/actions/list-payment-terms.ts",
			"app/actions/create-payment-term.ts",
			"app/actions/update-payment-term.ts",
			"app/actions/payment-term-lifecycle.ts",
			"app/actions/list-tax-registrations.ts",
			"app/actions/create-tax-registration.ts",
			"app/actions/update-tax-registration.ts",
			"app/actions/tax-registration-lifecycle.ts",
			"app/actions/submit-change-request.ts",
			"app/actions/approve-change-request.ts",
			"app/actions/reject-change-request.ts",
		]) {
			expect(source(relativePath)).toContain("forbidUnlessPermission");
		}
	});
});
