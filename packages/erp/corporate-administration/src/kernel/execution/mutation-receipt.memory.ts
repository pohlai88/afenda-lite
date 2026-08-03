import { errorResult, type Result } from "@afenda/errors";
import { resolveOperation } from "./async";
import type { MutationReceiptStore } from "./idempotency";

interface MemoryMutationReceipt {
	commandId: string;
	fingerprint: string;
	idempotencyKey: string;
	organizationId: string;
	result: unknown;
	status: "in_progress" | "completed" | "released";
}

/** Deterministic contract-test adapter mirroring `ca_mutation_receipt` behavior. */
export function createMemoryMutationReceiptStore(): MutationReceiptStore {
	const receipts: MemoryMutationReceipt[] = [];

	return {
		reserve(input) {
			return resolveOperation<
				{ status: "reserved" } | { status: "replay"; result: unknown }
			>(() => {
				const existing = receipts.find(
					(receipt) =>
						receipt.organizationId === input.organizationId &&
						receipt.commandId === input.commandId &&
						receipt.idempotencyKey === input.idempotencyKey,
				);
				if (existing) {
					if (existing.fingerprint !== input.fingerprint) {
						return errorResult.fail("CONFLICT", {
							publicMessage: "Idempotency key reused with different input",
						});
					}
					if (existing.status === "completed") {
						return errorResult.ok({
							status: "replay" as const,
							result: existing.result,
						});
					}
					return errorResult.fail("CONFLICT", {
						publicMessage: "Duplicate request already in progress",
					});
				}
				receipts.push({
					organizationId: input.organizationId,
					commandId: input.commandId,
					idempotencyKey: input.idempotencyKey,
					fingerprint: input.fingerprint,
					status: "in_progress",
					result: null,
				});
				return errorResult.ok({ status: "reserved" as const });
			});
		},

		complete(input): Promise<Result<void>> {
			return resolveOperation(() => {
				const receipt = receipts.find(
					(candidate) =>
						candidate.organizationId === input.organizationId &&
						candidate.commandId === input.commandId &&
						candidate.idempotencyKey === input.idempotencyKey,
				);
				if (receipt) {
					receipt.status = "completed";
					receipt.result = input.result;
				}
				return errorResult.ok(undefined);
			});
		},
	};
}
