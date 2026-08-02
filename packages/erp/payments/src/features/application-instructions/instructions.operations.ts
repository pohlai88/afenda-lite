import type { Result } from "@afenda/errors";

import type {
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
} from "../../kernel/contracts/domain";
import {
	type PaymentsAuthorizationPort,
	requirePaymentsPermission,
} from "../../kernel/execution/authorization";
import type { PaymentsPermission } from "../../kernel/execution/permissions";
import { parsePaymentsInput } from "../../kernel/validation/parse-input";
import {
	addPaymentApplicationInstructionInputSchema,
	getPaymentApplicationAvailabilityInputSchema,
	markApplicationInstructionAppliedInputSchema,
	markApplicationInstructionRejectedInputSchema,
} from "./instructions.schema";
import type { PaymentApplicationInstructionsStore } from "./instructions.store";

export interface ApplicationInstructionOperationDeps {
	authorization?: PaymentsAuthorizationPort | undefined;
	store: PaymentApplicationInstructionsStore;
}

function permit(
	deps: ApplicationInstructionOperationDeps,
	input: { organizationId: string; actorUserId: string },
	permission: PaymentsPermission,
): Promise<Result<void>> {
	return requirePaymentsPermission(deps.authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function addPaymentApplicationInstructionOperation(
	input: unknown,
	deps: ApplicationInstructionOperationDeps,
): Promise<Result<PaymentApplicationInstruction>> {
	const parsed = parsePaymentsInput(
		addPaymentApplicationInstructionInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(
		deps,
		parsed.data,
		"payments.application_instruction.manage",
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.addApplicationInstruction({
		organizationId: parsed.data.organizationId,
		paymentId: parsed.data.paymentId,
		targetModule: parsed.data.targetModule,
		targetDocumentType: parsed.data.targetDocumentType,
		targetDocumentId: parsed.data.targetDocumentId,
		intendedAmount: parsed.data.intendedAmount,
		currencyCode: parsed.data.currencyCode,
		createdBy: parsed.data.actorUserId,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

export async function markApplicationInstructionAppliedOperation(
	input: unknown,
	deps: ApplicationInstructionOperationDeps,
): Promise<Result<PaymentApplicationInstruction>> {
	const parsed = parsePaymentsInput(
		markApplicationInstructionAppliedInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(
		deps,
		parsed.data,
		"payments.application_instruction.manage",
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.markInstructionApplied(parsed.data);
}

export async function markApplicationInstructionRejectedOperation(
	input: unknown,
	deps: ApplicationInstructionOperationDeps,
): Promise<Result<PaymentApplicationInstruction>> {
	const parsed = parsePaymentsInput(
		markApplicationInstructionRejectedInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(
		deps,
		parsed.data,
		"payments.application_instruction.manage",
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.markInstructionRejected(parsed.data);
}

export async function getPaymentApplicationAvailabilityOperation(
	input: unknown,
	deps: ApplicationInstructionOperationDeps,
): Promise<Result<PaymentApplicationAvailability>> {
	const parsed = parsePaymentsInput(
		getPaymentApplicationAvailabilityInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.availability.read");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.getApplicationAvailability(
		parsed.data.organizationId,
		parsed.data.paymentId,
	);
}
