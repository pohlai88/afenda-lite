import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type { PaymentMethod } from "../../kernel/contracts/domain";
import type {
	PaymentMethodsStore,
	PaymentMethodUpdateRecord,
} from "./methods.store";

export interface PaymentMethodsMemoryState {
	methods: Map<string, PaymentMethod>;
}

function resolveOperation<T>(operation: () => Result<T>): Promise<Result<T>> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

export function createMemoryPaymentMethodMethods(
	state: PaymentMethodsMemoryState,
): PaymentMethodsStore {
	return {
		createPaymentMethod(
			record: Omit<PaymentMethod, "id" | "createdAt" | "updatedAt">,
		): Promise<Result<PaymentMethod>> {
			return resolveOperation(() => {
				for (const method of state.methods.values()) {
					if (
						method.organizationId === record.organizationId &&
						method.normalizedCode === record.normalizedCode
					) {
						return errorResult.fail("CONFLICT", {
							publicMessage: "Payment method code already exists",
						});
					}
				}
				const now = new Date();
				const method: PaymentMethod = {
					...record,
					id: randomUUID(),
					createdAt: now,
					updatedAt: now,
				};
				state.methods.set(method.id, method);
				return errorResult.ok({ ...method });
			});
		},

		getPaymentMethodById(
			organizationId: string,
			id: string,
		): Promise<Result<PaymentMethod | null>> {
			return resolveOperation(() => {
				const method = state.methods.get(id);
				if (!method || method.organizationId !== organizationId) {
					return errorResult.ok(null);
				}
				return errorResult.ok({ ...method });
			});
		},

		listPaymentMethods(
			organizationId: string,
		): Promise<Result<PaymentMethod[]>> {
			return resolveOperation(() =>
				errorResult.ok(
					[...state.methods.values()]
						.filter((method) => method.organizationId === organizationId)
						.map((method) => ({ ...method })),
				),
			);
		},

		updatePaymentMethod(
			record: PaymentMethodUpdateRecord,
		): Promise<Result<PaymentMethod>> {
			return resolveOperation(() => {
				const method = state.methods.get(record.id);
				if (!method || method.organizationId !== record.organizationId) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Payment method not found",
					});
				}
				const updated: PaymentMethod = {
					...method,
					name: record.name ?? method.name,
					instrumentRequirement:
						record.instrumentRequirement ?? method.instrumentRequirement,
					allowedInstrumentKinds:
						record.allowedInstrumentKinds ?? method.allowedInstrumentKinds,
					allowedAccountKinds:
						record.allowedAccountKinds ?? method.allowedAccountKinds,
					active: record.active ?? method.active,
					updatedBy: record.updatedBy,
					updatedAt: new Date(),
				};
				state.methods.set(updated.id, updated);
				return errorResult.ok({ ...updated });
			});
		},
	};
}
