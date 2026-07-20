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
			"app/actions/create-item.ts": ["master_data.manage"],
			"app/actions/create-item-group.ts": ["master_data.manage"],
			"app/actions/create-warehouse.ts": ["master_data.manage"],
			"app/actions/master-root-lifecycle.ts": ["master_data.manage"],
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
			"app/actions/search-master-data.ts": ["master_data.read"],
			"app/actions/list-sales-orders.ts": ["sales.order.list"],
			"app/actions/get-sales-order.ts": ["sales.order.read"],
			"app/actions/create-sales-order.ts": ["sales.order.create"],
			"app/actions/add-sales-order-line.ts": ["sales.order.update"],
			"app/actions/post-sales-order.ts": ["sales.order.post"],
			"app/actions/cancel-sales-order.ts": ["sales.order.cancel"],
			"app/actions/list-purchase-orders.ts": ["purchasing.order.list"],
			"app/actions/get-purchase-order.ts": ["purchasing.order.read"],
			"app/actions/create-purchase-order.ts": ["purchasing.order.create"],
			"app/actions/add-purchase-order-line.ts": ["purchasing.order.update"],
			"app/actions/post-purchase-order.ts": ["purchasing.order.post"],
			"app/actions/cancel-purchase-order.ts": ["purchasing.order.cancel"],
			"app/actions/close-purchase-order.ts": ["purchasing.order.close"],
			"app/actions/list-stock-movements.ts": ["inventory.movement.read"],
			"app/actions/list-stock-reservations.ts": ["inventory.movement.read"],
			"app/actions/get-stock-movement.ts": ["inventory.movement.read"],
			"app/actions/get-stock-availability.ts": ["inventory.availability.read"],
			"app/actions/create-stock-movement.ts": [
				"inventory.movement.create",
				"inventory.adjustment.post",
			],
			"app/actions/add-stock-movement-line.ts": ["inventory.movement.create"],
			"app/actions/post-stock-movement.ts": ["inventory.movement.post"],
			"app/actions/cancel-stock-movement.ts": ["inventory.movement.cancel"],
			"app/actions/create-reversal-movement.ts": ["inventory.movement.post"],
			"app/actions/reserve-stock.ts": ["inventory.reservation.create"],
			"app/actions/release-reservation.ts": ["inventory.reservation.release"],
			"app/actions/expire-reservation.ts": ["inventory.reservation.release"],
			"app/actions/cancel-reservation.ts": ["inventory.reservation.release"],
			"app/actions/list-goods-receipts.ts": ["receiving.receipt.read"],
			"app/actions/get-goods-receipt.ts": ["receiving.receipt.read"],
			"app/actions/create-goods-receipt.ts": ["receiving.receipt.create"],
			"app/actions/add-goods-receipt-line.ts": ["receiving.receipt.update"],
			"app/actions/post-goods-receipt.ts": ["receiving.receipt.post"],
			"app/actions/record-receiving-discrepancy.ts": [
				"receiving.discrepancy.record",
			],
			"app/actions/resolve-receiving-discrepancy.ts": [
				"receiving.discrepancy.resolve",
			],
			"app/actions/cancel-goods-receipt.ts": ["receiving.receipt.cancel"],
			"app/actions/reverse-goods-receipt.ts": ["receiving.receipt.reverse"],
			"app/actions/get-delivery.ts": ["fulfillment.delivery.read"],
			"app/actions/list-deliveries.ts": ["fulfillment.delivery.read"],
			"app/actions/create-draft-delivery.ts": ["fulfillment.delivery.create"],
			"app/actions/add-delivery-line.ts": ["fulfillment.delivery.update"],
			"app/actions/start-picking.ts": ["fulfillment.picking.confirm"],
			"app/actions/confirm-pick.ts": ["fulfillment.picking.confirm"],
			"app/actions/confirm-pack.ts": ["fulfillment.packing.confirm"],
			"app/actions/post-delivery.ts": ["fulfillment.delivery.post"],
			"app/actions/record-proof-of-delivery.ts": ["fulfillment.pod.record"],
			"app/actions/cancel-delivery.ts": ["fulfillment.delivery.cancel"],
			"app/actions/close-delivery.ts": ["fulfillment.delivery.close"],
			"app/actions/get-sales-invoice.ts": ["receivables.invoice.read"],
			"app/actions/list-sales-invoices.ts": ["receivables.invoice.read"],
			"app/actions/get-customer-balance.ts": ["receivables.balance.read"],
			"app/actions/get-customer-aging.ts": ["receivables.aging.read"],
			"app/actions/create-draft-sales-invoice.ts": ["receivables.invoice.create"],
			"app/actions/add-sales-invoice-line.ts": ["receivables.invoice.update"],
			"app/actions/post-sales-invoice.ts": ["receivables.invoice.post"],
			"app/actions/issue-credit-note.ts": ["receivables.credit_note.issue"],
			"app/actions/apply-customer-receipt.ts": ["receivables.receipt.apply"],
			"app/actions/cancel-sales-invoice.ts": ["receivables.invoice.cancel"],
			"app/actions/close-sales-invoice.ts": ["receivables.invoice.close"],
			"app/actions/reverse-customer-receipt-application.ts": [
				"receivables.receipt_application.reverse",
			],
			"app/actions/get-supplier-invoice.ts": ["payables.read"],
			"app/actions/list-supplier-invoices.ts": ["payables.read"],
			"app/actions/get-supplier-balance.ts": ["payables.read"],
			"app/actions/create-draft-supplier-invoice.ts": ["payables.manage"],
			"app/actions/add-supplier-invoice-line.ts": ["payables.manage"],
			"app/actions/match-supplier-invoice.ts": ["payables.manage"],
			"app/actions/post-supplier-invoice.ts": ["payables.manage"],
			"app/actions/issue-supplier-credit-note.ts": ["payables.manage"],
			"app/actions/create-draft-supplier-credit-note.ts": ["payables.manage"],
			"app/actions/add-supplier-credit-note-line.ts": ["payables.manage"],
			"app/actions/post-supplier-credit-note.ts": ["payables.manage"],
			"app/actions/apply-supplier-credit.ts": ["payables.manage"],
			"app/actions/apply-supplier-payment.ts": ["payables.manage"],
			"app/actions/reverse-supplier-payment-application.ts": ["payables.manage"],
			"app/actions/cancel-supplier-invoice.ts": ["payables.manage"],
			"app/actions/get-payment.ts": ["payments.payment.read"],
			"app/actions/list-payments.ts": ["payments.payment.read"],
			"app/actions/create-draft-payment.ts": ["payments.payment.create"],
			"app/actions/create-payment-account.ts": ["payments.account.manage"],
			"app/actions/list-payment-accounts.ts": ["payments.account.read"],
			"app/actions/add-payment-application-instruction.ts": ["payments.application_instruction.manage"],
			"app/actions/create-and-post-payment-transfer.ts": [
				"payments.transfer.create",
				"payments.transfer.post",
			],
			"app/actions/post-payment.ts": ["payments.payment.post"],
			"app/actions/reverse-payment.ts": ["payments.payment.reverse"],
			"app/actions/post-refund.ts": ["payments.refund.create", "payments.refund.post"],
			"app/actions/get-payment-application-availability.ts": [
				"payments.availability.read",
			],
			"app/actions/get-journal.ts": ["accounting.journal.read"],
			"app/actions/list-journals.ts": ["accounting.journal.read"],
			"app/actions/get-trial-balance.ts": ["accounting.trial_balance.read"],
			"app/actions/create-draft-journal.ts": ["accounting.journal.create"],
			"app/actions/add-journal-line.ts": ["accounting.journal.create"],
			"app/actions/post-journal.ts": ["accounting.journal.post"],
			"app/actions/reverse-journal.ts": ["accounting.journal.reverse"],
			"app/actions/open-accounting-period.ts": ["accounting.period.open"],
			"app/actions/soft-close-accounting-period.ts": [
				"accounting.period.soft_close",
			],
			"app/actions/close-accounting-period.ts": ["accounting.period.close"],
			"app/actions/reopen-accounting-period.ts": [
				"accounting.period.reopen",
			],
			"features/org-admin/org-admin-shell.tsx": [
				"org.roles.manage",
				"clients.invite",
			],
			"features/master-data/master-data-shell.tsx": [
				"master_data.read",
				"master_data.manage",
				"master_data.approve",
				"master_data.import_approve",
			],
			"features/sales/sales-shell.tsx": [
				"sales.order.read",
				"sales.order.create",
				"sales.order.update",
				"sales.order.post",
				"sales.order.cancel",
			],
			"features/purchasing/purchasing-shell.tsx": [
				"purchasing.order.read",
				"purchasing.order.create",
				"purchasing.order.update",
				"purchasing.order.post",
				"purchasing.order.cancel",
				"purchasing.order.close",
			],
			"features/inventory/inventory-shell.tsx": [
				"inventory.movement.read",
				"inventory.availability.read",
				"inventory.movement.create",
				"inventory.movement.post",
				"inventory.movement.cancel",
				"inventory.reservation.create",
				"inventory.reservation.release",
				"inventory.adjustment.post",
			],
			"features/receiving/receiving-shell.tsx": [
				"receiving.receipt.read",
				"receiving.receipt.create",
				"receiving.receipt.update",
				"receiving.receipt.post",
				"receiving.receipt.cancel",
				"receiving.receipt.reverse",
				"receiving.discrepancy.record",
				"receiving.discrepancy.resolve",
			],
			"features/fulfillment/fulfillment-shell.tsx": [
				"fulfillment.delivery.read",
				"fulfillment.delivery.create",
				"fulfillment.delivery.update",
				"fulfillment.picking.confirm",
				"fulfillment.packing.confirm",
				"fulfillment.delivery.post",
				"fulfillment.delivery.cancel",
				"fulfillment.pod.record",
				"fulfillment.delivery.close",
			],
			"features/receivables/receivables-shell.tsx": [
				"receivables.invoice.read",
				"receivables.invoice.create",
				"receivables.invoice.update",
				"receivables.invoice.post",
				"receivables.credit_note.issue",
				"receivables.receipt.apply",
				"receivables.invoice.cancel",
			],
			"features/payables/payables-shell.tsx": [
				"payables.read",
				"payables.manage",
			],
			"features/payments/payments-shell.tsx": [
				"payments.payment.read",
				"payments.payment.create",
				"payments.account.manage",
				"payments.account.read",
				"payments.application_instruction.manage",
				"payments.transfer.create",
				"payments.payment.post",
				"payments.payment.reverse",
				"payments.refund.create",
				"payments.availability.read",
			],
			"features/accounting/accounting-shell.tsx": [
				"accounting.journal.read",
				"accounting.journal.create",
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
			"app/actions/close-delivery.ts",
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
			"app/actions/get-customer-aging.ts",
			"app/actions/create-draft-sales-invoice.ts",
			"app/actions/add-sales-invoice-line.ts",
			"app/actions/post-sales-invoice.ts",
			"app/actions/issue-credit-note.ts",
			"app/actions/apply-customer-receipt.ts",
			"app/actions/cancel-sales-invoice.ts",
			"app/actions/close-sales-invoice.ts",
			"app/actions/reverse-customer-receipt-application.ts",
		] as const;
		for (const relativePath of receivablesActions) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('from "@afenda/receivables"');
			expect(actionSource).toContain("mapPackageResult");
		}

		for (const relativePath of receivablesActions.slice(4)) {
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
			"app/actions/create-draft-supplier-credit-note.ts",
			"app/actions/add-supplier-credit-note-line.ts",
			"app/actions/post-supplier-credit-note.ts",
			"app/actions/apply-supplier-credit.ts",
			"app/actions/apply-supplier-payment.ts",
			"app/actions/reverse-supplier-payment-application.ts",
			"app/actions/cancel-supplier-invoice.ts",
		] as const;
		for (const relativePath of payablesActions) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('from "@afenda/payables"');
			expect(
				actionSource.includes("mapPackageResult") ||
					actionSource.includes("runVersionedSupplierInvoiceMutation"),
			).toBe(true);
		}

		const versionedHelper = source(
			"app/actions/run-versioned-supplier-invoice-mutation.ts",
		);
		expect(versionedHelper).toContain("mapPackageResult");
		expect(versionedHelper).toContain("revalidatePayablesPaths");

		for (const relativePath of payablesActions.slice(3)) {
			const actionSource = source(relativePath);
			expect(
				actionSource.includes('revalidatePath("/admin/payables")') ||
					actionSource.includes("revalidatePayablesPaths") ||
					actionSource.includes("runVersionedSupplierInvoiceMutation"),
			).toBe(true);
		}
	});

	it("pins payments Actions to package results and dual route refresh", () => {
		const paymentsActions = [
			"app/actions/get-payment.ts",
			"app/actions/list-payments.ts",
			"app/actions/create-draft-payment.ts",
			"app/actions/create-payment-account.ts",
			"app/actions/list-payment-accounts.ts",
			"app/actions/add-payment-application-instruction.ts",
			"app/actions/create-and-post-payment-transfer.ts",
			"app/actions/post-payment.ts",
			"app/actions/reverse-payment.ts",
			"app/actions/post-refund.ts",
			"app/actions/get-payment-application-availability.ts",
		] as const;
		for (const relativePath of paymentsActions) {
			const actionSource = source(relativePath);
			expect(actionSource).toContain('from "@afenda/payments"');
			expect(actionSource).toContain("mapPackageResult");
		}

		for (const relativePath of [
			"app/actions/create-draft-payment.ts",
			"app/actions/create-payment-account.ts",
			"app/actions/add-payment-application-instruction.ts",
			"app/actions/create-and-post-payment-transfer.ts",
			"app/actions/post-payment.ts",
			"app/actions/reverse-payment.ts",
			"app/actions/post-refund.ts",
		]) {
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
			"app/actions/soft-close-accounting-period.ts",
			"app/actions/close-accounting-period.ts",
			"app/actions/reopen-accounting-period.ts",
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
		for (const relativePath of [
			"app/actions/create-payment-term.ts",
			"app/actions/create-item.ts",
			"app/actions/create-item-group.ts",
			"app/actions/create-warehouse.ts",
			"app/actions/master-root-lifecycle.ts",
		]) {
			expect(
				source(relativePath),
				`${relativePath} must use member permission helper`,
			).toContain("runMemberPermissionAction");
		}
	});
});
