import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src",
);

/** Feature-first root allowlist (ERP-SCAFFOLDING §3). */
const ALLOWED_ROOTS = [
	"composition",
	"facade",
	"features",
	"index.ts",
	"kernel",
	"testing",
];

/** Frozen public API of "@afenda/payments" — additions are reviewed, removals are breaking. */
const PUBLIC_EXPORTS = [
	"PAYMENTS_PERMISSION_ACCOUNT_MANAGE",
	"PAYMENTS_PERMISSION_ACCOUNT_READ",
	"PAYMENTS_PERMISSION_APPLICATION_INSTRUCTION_MANAGE",
	"PAYMENTS_PERMISSION_AVAILABILITY_READ",
	"PAYMENTS_PERMISSION_CODES",
	"PAYMENTS_PERMISSION_PAYMENT_CREATE",
	"PAYMENTS_PERMISSION_PAYMENT_POST",
	"PAYMENTS_PERMISSION_PAYMENT_READ",
	"PAYMENTS_PERMISSION_PAYMENT_REVERSE",
	"PAYMENTS_PERMISSION_PAYMENT_UPDATE",
	"PAYMENTS_PERMISSION_REFUND_CREATE",
	"PAYMENTS_PERMISSION_REFUND_POST",
	"PAYMENTS_PERMISSION_TRANSFER_CREATE",
	"PAYMENTS_PERMISSION_TRANSFER_POST",
	"addPaymentApplicationInstruction",
	"addPaymentApplicationInstructionInputSchema",
	"createAndPostPaymentTransfer",
	"createAndPostPaymentTransferInputSchema",
	"createDraftPayment",
	"createDraftPaymentInputSchema",
	"createPaymentAccount",
	"createPaymentAccountInputSchema",
	"getPaymentApplicationAvailability",
	"getPaymentApplicationAvailabilityInputSchema",
	"getPaymentById",
	"getPaymentByIdInputSchema",
	"listPaymentAccounts",
	"listPaymentAccountsInputSchema",
	"listPayments",
	"listPaymentsInputSchema",
	"markApplicationInstructionApplied",
	"markApplicationInstructionAppliedInputSchema",
	"markApplicationInstructionRejected",
	"markApplicationInstructionRejectedInputSchema",
	"money",
	"postPayment",
	"postPaymentInputSchema",
	"postRefund",
	"postRefundInputSchema",
	"reconcilePayments",
	"reversePayment",
	"reversePaymentInputSchema",
];

describe("payments export surface", () => {
	it("keeps src/ root on the feature-first allowlist", () => {
		const entries = readdirSync(srcRoot).sort();
		expect(entries).toEqual([...ALLOWED_ROOTS].sort());
	});

	it("keeps every frozen public runtime export available", async () => {
		const module = await import("../src/index");
		const actual = Object.keys(module).sort();
		const missing = PUBLIC_EXPORTS.filter((name) => !actual.includes(name));
		expect(missing).toEqual([]);
	}, 10_000); // 10s timeout for dynamic import
});
