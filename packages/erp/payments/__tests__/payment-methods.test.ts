import { describe, expect, it } from "vitest";

import { createMemoryPaymentMethodMethods } from "../src/features/payment-methods/methods.memory";
import {
	createPaymentMethodOperation,
	deactivatePaymentMethodOperation,
	listPaymentMethodsOperation,
	seedDefaultPaymentMethods,
	updatePaymentMethodOperation,
} from "../src/features/payment-methods/methods.operations";
import type { PaymentMethod } from "../src/kernel/contracts/domain";

const organizationId = "org-1";
const actorUserId = "user-1";
const authorization = {
	can() {
		return Promise.resolve(true);
	},
};

function makeDeps() {
	const state = { methods: new Map<string, PaymentMethod>() };
	return { authorization, store: createMemoryPaymentMethodMethods(state) };
}

const base = {
	organizationId,
	actorUserId,
	correlationId: "corr-1",
	idempotencyKey: "method-1",
};

describe("payment methods", () => {
	it("creates, updates, deactivates, and lists methods", async () => {
		const deps = makeDeps();
		const created = await createPaymentMethodOperation(
			{
				...base,
				code: "CHECK",
				name: "Check",
				kind: "check",
				instrumentRequirement: "required",
				allowedInstrumentKinds: ["check"],
				allowedAccountKinds: ["bank"],
			},
			deps,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const updated = await updatePaymentMethodOperation(
			{ ...base, idempotencyKey: "m-upd", id: created.data.id, name: "Cheque" },
			deps,
		);
		expect(updated.ok && updated.data.name === "Cheque").toBe(true);

		const deactivated = await deactivatePaymentMethodOperation(
			{ ...base, idempotencyKey: "m-off", id: created.data.id },
			deps,
		);
		expect(deactivated.ok && deactivated.data.active === false).toBe(true);

		const listed = await listPaymentMethodsOperation(
			{ organizationId, actorUserId },
			deps,
		);
		expect(listed.ok && listed.data.length === 1).toBe(true);
	});

	it("rejects duplicate codes per organization", async () => {
		const deps = makeDeps();
		const input = {
			...base,
			code: "CASH",
			name: "Cash",
			kind: "cash",
			instrumentRequirement: "forbidden",
			allowedInstrumentKinds: [],
			allowedAccountKinds: ["cash"],
		};
		expect((await createPaymentMethodOperation(input, deps)).ok).toBe(true);
		const dup = await createPaymentMethodOperation(
			{ ...input, idempotencyKey: "method-2" },
			deps,
		);
		expect(dup.ok).toBe(false);
	});

	it("rejects an unknown method on update", async () => {
		const deps = makeDeps();
		const missing = await updatePaymentMethodOperation(
			{
				...base,
				id: "00000000-0000-4000-8000-00000000dead",
				name: "Ghost",
			},
			deps,
		);
		expect(missing.ok).toBe(false);
	});

	it("seeds the four defaults idempotently", async () => {
		const deps = makeDeps();
		const first = await seedDefaultPaymentMethods({ ...base }, deps);
		expect(first.ok && first.data.length === 4).toBe(true);
		const again = await seedDefaultPaymentMethods(
			{ ...base, idempotencyKey: "seed-2" },
			deps,
		);
		expect(again.ok && again.data.length === 0).toBe(true);
		const listed = await listPaymentMethodsOperation(
			{ organizationId, actorUserId },
			deps,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.map((method) => method.code).sort()).toEqual([
				"bank-transfer",
				"cash",
				"check",
				"other",
			]);
		}
	});
});
