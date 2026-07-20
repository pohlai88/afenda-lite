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
			"app/actions/list-stock-movements.ts": ["inventory.read"],
			"app/actions/get-stock-movement.ts": ["inventory.read"],
			"app/actions/get-stock-availability.ts": ["inventory.read"],
			"app/actions/create-stock-movement.ts": ["inventory.manage"],
			"app/actions/add-stock-movement-line.ts": ["inventory.manage"],
			"app/actions/post-stock-movement.ts": ["inventory.manage"],
			"app/actions/reserve-stock.ts": ["inventory.manage"],
			"app/actions/release-reservation.ts": ["inventory.manage"],
			"app/actions/list-goods-receipts.ts": ["receiving.read"],
			"app/actions/get-goods-receipt.ts": ["receiving.read"],
			"app/actions/create-goods-receipt.ts": ["receiving.manage"],
			"app/actions/add-goods-receipt-line.ts": ["receiving.manage"],
			"app/actions/post-goods-receipt.ts": ["receiving.manage"],
			"app/actions/record-receiving-discrepancy.ts": ["receiving.manage"],
			"app/actions/cancel-goods-receipt.ts": ["receiving.manage"],
			"app/actions/get-delivery.ts": ["fulfillment.read"],
			"app/actions/list-deliveries.ts": ["fulfillment.read"],
			"app/actions/create-draft-delivery.ts": ["fulfillment.manage"],
			"app/actions/add-delivery-line.ts": ["fulfillment.manage"],
			"app/actions/start-picking.ts": ["fulfillment.manage"],
			"app/actions/confirm-pick.ts": ["fulfillment.manage"],
			"app/actions/confirm-pack.ts": ["fulfillment.manage"],
			"app/actions/post-delivery.ts": ["fulfillment.manage"],
			"app/actions/record-proof-of-delivery.ts": ["fulfillment.manage"],
			"app/actions/cancel-delivery.ts": ["fulfillment.manage"],
			"app/actions/get-sales-invoice.ts": ["receivables.read"],
			"app/actions/list-sales-invoices.ts": ["receivables.read"],
			"app/actions/get-customer-balance.ts": ["receivables.read"],
			"app/actions/create-draft-sales-invoice.ts": ["receivables.manage"],
			"app/actions/add-sales-invoice-line.ts": ["receivables.manage"],
			"app/actions/post-sales-invoice.ts": ["receivables.manage"],
			"app/actions/issue-credit-note.ts": ["receivables.manage"],
			"app/actions/allocate-customer-receipt.ts": ["receivables.manage"],
			"app/actions/cancel-sales-invoice.ts": ["receivables.manage"],
			"app/actions/get-supplier-invoice.ts": ["payables.read"],
			"app/actions/list-supplier-invoices.ts": ["payables.read"],
			"app/actions/get-supplier-balance.ts": ["payables.read"],
			"app/actions/create-draft-supplier-invoice.ts": ["payables.manage"],
			"app/actions/add-supplier-invoice-line.ts": ["payables.manage"],
			"app/actions/match-supplier-invoice.ts": ["payables.manage"],
			"app/actions/post-supplier-invoice.ts": ["payables.manage"],
			"app/actions/issue-supplier-credit-note.ts": ["payables.manage"],
			"app/actions/allocate-supplier-payment.ts": ["payables.manage"],
			"app/actions/cancel-supplier-invoice.ts": ["payables.manage"],
			"app/actions/get-payment.ts": ["payments.read"],
			"app/actions/list-payments.ts": ["payments.read"],
			"app/actions/create-draft-payment.ts": ["payments.manage"],
			"app/actions/add-payment-allocation.ts": ["payments.manage"],
			"app/actions/post-payment.ts": ["payments.manage"],
			"app/actions/reverse-payment.ts": ["payments.manage"],
			"app/actions/post-refund.ts": ["payments.manage"],
			"app/actions/get-journal.ts": ["accounting.read"],
			"app/actions/list-journals.ts": ["accounting.read"],
			"app/actions/get-trial-balance.ts": ["accounting.read"],
			"app/actions/create-draft-journal.ts": ["accounting.manage"],
			"app/actions/add-journal-line.ts": ["accounting.manage"],
			"app/actions/post-journal.ts": ["accounting.manage"],
			"app/actions/reverse-journal.ts": ["accounting.manage"],
			"app/actions/open-accounting-period.ts": ["accounting.manage"],
			"app/actions/close-accounting-period.ts": ["accounting.manage"],
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
			"features/inventory/inventory-shell.tsx": [
				"inventory.read",
				"inventory.manage",
			],
			"features/receiving/receiving-shell.tsx": [
				"receiving.read",
				"receiving.manage",
			],
			"features/fulfillment/fulfillment-shell.tsx": [
				"fulfillment.read",
				"fulfillment.manage",
			],
			"features/receivables/receivables-shell.tsx": [
				"receivables.read",
				"receivables.manage",
			],
			"features/payables/payables-shell.tsx": [
				"payables.read",
				"payables.manage",
			],
			"features/payments/payments-shell.tsx": [
				"payments.read",
				"payments.manage",
			],
			"features/accounting/accounting-shell.tsx": [
				"accounting.read",
				"accounting.manage",
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

	it("pins fulfillment Actions to package results and dual route refresh", () => {
		const fulfillmentActions = [
			"app/actions/get-delivery.ts",
			"app/actions/list-deliveries.ts",
			"app/actions/create-draft-delivery.ts",
			"app/actions/add-delivery-line.ts",
			"app/actions/start-picking.ts",
			"app/actions/confirm-pick.ts",
			"app/actions/confirm-pack.ts",
			"app/actions/post-delivery.ts",
			"app/actions/record-proof-of-delivery.ts",
			"app/actions/cancel-delivery.ts",
		] as const;
		for (const relativePath of fulfillmentActions) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('from "@afenda/fulfillment"');
			expect(actionSource).toContain("mapPackageResult");
		}

		for (const relativePath of fulfillmentActions.slice(2)) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('revalidatePath("/admin/fulfillment")');
			expect(actionSource).toContain('revalidatePath("/client/fulfillment")');
		}
	});

	it("pins receivables Actions to package results and dual route refresh", () => {
		const receivablesActions = [
			"app/actions/get-sales-invoice.ts",
			"app/actions/list-sales-invoices.ts",
			"app/actions/get-customer-balance.ts",
			"app/actions/create-draft-sales-invoice.ts",
			"app/actions/add-sales-invoice-line.ts",
			"app/actions/post-sales-invoice.ts",
			"app/actions/issue-credit-note.ts",
			"app/actions/allocate-customer-receipt.ts",
			"app/actions/cancel-sales-invoice.ts",
		] as const;
		for (const relativePath of receivablesActions) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('from "@afenda/receivables"');
			expect(actionSource).toContain("mapPackageResult");
		}

		for (const relativePath of receivablesActions.slice(3)) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('revalidatePath("/admin/receivables")');
			expect(actionSource).toContain('revalidatePath("/client/receivables")');
		}
	});

	it("pins payables Actions to package results and dual route refresh", () => {
		const payablesActions = [
			"app/actions/get-supplier-invoice.ts",
			"app/actions/list-supplier-invoices.ts",
			"app/actions/get-supplier-balance.ts",
			"app/actions/create-draft-supplier-invoice.ts",
			"app/actions/add-supplier-invoice-line.ts",
			"app/actions/match-supplier-invoice.ts",
			"app/actions/post-supplier-invoice.ts",
			"app/actions/issue-supplier-credit-note.ts",
			"app/actions/allocate-supplier-payment.ts",
			"app/actions/cancel-supplier-invoice.ts",
		] as const;
		for (const relativePath of payablesActions) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('from "@afenda/payables"');
			expect(actionSource).toContain("mapPackageResult");
		}

		for (const relativePath of payablesActions.slice(3)) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('revalidatePath("/admin/payables")');
			expect(actionSource).toContain('revalidatePath("/client/payables")');
		}
	});

	it("pins payments Actions to package results and dual route refresh", () => {
		const paymentsActions = [
			"app/actions/get-payment.ts",
			"app/actions/list-payments.ts",
			"app/actions/create-draft-payment.ts",
			"app/actions/add-payment-allocation.ts",
			"app/actions/post-payment.ts",
			"app/actions/reverse-payment.ts",
			"app/actions/post-refund.ts",
		] as const;
		for (const relativePath of paymentsActions) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('from "@afenda/payments"');
			expect(actionSource).toContain("mapPackageResult");
		}

		for (const relativePath of paymentsActions.slice(2)) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('revalidatePath("/admin/payments")');
			expect(actionSource).toContain('revalidatePath("/client/payments")');
		}
	});

	it("pins accounting Actions to package results and dual route refresh", () => {
		const accountingActions = [
			"app/actions/get-journal.ts",
			"app/actions/list-journals.ts",
			"app/actions/get-trial-balance.ts",
			"app/actions/create-draft-journal.ts",
			"app/actions/add-journal-line.ts",
			"app/actions/post-journal.ts",
			"app/actions/reverse-journal.ts",
			"app/actions/open-accounting-period.ts",
			"app/actions/close-accounting-period.ts",
		] as const;
		for (const relativePath of accountingActions) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('from "@afenda/accounting"');
			expect(actionSource).toContain("mapPackageResult");
		}

		for (const relativePath of accountingActions.slice(3)) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('revalidatePath("/admin/accounting")');
			expect(actionSource).toContain('revalidatePath("/client/accounting")');
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
