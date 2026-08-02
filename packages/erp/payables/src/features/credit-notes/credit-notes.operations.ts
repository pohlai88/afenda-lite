import type { Result } from "@afenda/errors";

import type {
	SupplierInvoice,
	SupplierInvoiceLine,
} from "../../kernel/contracts/domain";
import type { PayablesEffects } from "../../kernel/contracts/effects";
import {
	type PayablesAuthorizationPort,
	requirePayablesPermission,
} from "../../kernel/execution/authorization";
import {
	normalizedCode,
	parsePayablesInput,
} from "../../kernel/validation/parse-input";
import {
	addCreditNoteLineInputSchema,
	createCreditNoteInputSchema,
	issueCreditNoteInputSchema,
	postCreditNoteInputSchema,
} from "./credit-notes.schema";
import type { PayablesCreditNotesStore } from "./credit-notes.store";

export interface CreditNoteOperationDeps {
	authorization?: PayablesAuthorizationPort | undefined;
	effects: PayablesEffects;
	store: PayablesCreditNotesStore;
}

function permit(
	deps: CreditNoteOperationDeps,
	input: { organizationId: string; actorUserId: string },
): Promise<Result<void>> {
	return requirePayablesPermission(deps.authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: "payables.manage",
	});
}

export async function createDraftSupplierCreditNoteOperation(
	input: unknown,
	deps: CreditNoteOperationDeps,
): Promise<Result<SupplierInvoice>> {
	const parsed = parsePayablesInput(createCreditNoteInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.createCredit({
		...parsed.data,
		documentType: "credit_note",
		effects: deps.effects,
		normalizedCode: normalizedCode(parsed.data.code),
	});
}

export async function addSupplierCreditNoteLineOperation(
	input: unknown,
	deps: CreditNoteOperationDeps,
): Promise<Result<SupplierInvoiceLine>> {
	const parsed = parsePayablesInput(addCreditNoteLineInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.addCreditLine(parsed.data);
}

export async function postSupplierCreditNoteOperation(
	input: unknown,
	deps: CreditNoteOperationDeps,
): Promise<Result<SupplierInvoice>> {
	const parsed = parsePayablesInput(postCreditNoteInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.postCredit({
		...parsed.data,
		effects: deps.effects,
	});
}

/** Composite: create → add single line → post (one-shot credit issue). */
export async function issueSupplierCreditNoteOperation(
	input: unknown,
	deps: CreditNoteOperationDeps,
): Promise<Result<SupplierInvoice>> {
	const parsed = parsePayablesInput(issueCreditNoteInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data);
	if (!allowed.ok) {
		return allowed;
	}
	const created = await createDraftSupplierCreditNoteOperation(
		parsed.data,
		deps,
	);
	if (!created.ok) {
		return created;
	}
	const line = await addSupplierCreditNoteLineOperation(
		{
			...parsed.data,
			creditNoteId: created.data.id,
			description: parsed.data.description,
			itemId: parsed.data.itemId,
			quantity: "1",
			unitPrice: parsed.data.amount,
		},
		deps,
	);
	if (!line.ok) {
		return line;
	}
	return postSupplierCreditNoteOperation(
		{
			...parsed.data,
			creditNoteId: created.data.id,
			expectedVersion: created.data.version + 1,
		},
		deps,
	);
}
