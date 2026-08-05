import { errorResult } from "@afenda/errors";

import type {
	PayrollFinalSettlement,
	PayrollFinalSettlementLine,
} from "./contract";
import type { PayrollFinalSettlementStore } from "./settlement.store";

const clone = <T>(value: T): T => structuredClone(value);

export interface FinalSettlementMemoryState {
	itemKeys: Map<string, string>;
	lines: Map<string, PayrollFinalSettlementLine>;
	settlements: Map<string, PayrollFinalSettlement>;
}

export function createFinalSettlementMemoryState(): FinalSettlementMemoryState {
	return {
		itemKeys: new Map(),
		lines: new Map(),
		settlements: new Map(),
	};
}

export function resetFinalSettlementMemoryState(
	state: FinalSettlementMemoryState,
): void {
	state.itemKeys.clear();
	state.lines.clear();
	state.settlements.clear();
}

function scoped(organizationId: string, value: string): string {
	return `${organizationId}:${value}`;
}

function saveSettlement(
	state: FinalSettlementMemoryState,
	input: { expectedVersion: number; settlement: PayrollFinalSettlement },
) {
	const current = state.settlements.get(input.settlement.id);
	if (
		current === undefined ||
		current.organizationId !== input.settlement.organizationId ||
		current.version !== input.expectedVersion ||
		input.settlement.version !== input.expectedVersion + 1
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	state.settlements.set(input.settlement.id, clone(input.settlement));
	return errorResult.ok(clone(input.settlement));
}

export function createMemoryFinalSettlementMethods(
	state: FinalSettlementMemoryState,
): PayrollFinalSettlementStore {
	return {
		createFinalSettlement(input) {
			const key = scoped(
				input.settlement.organizationId,
				input.settlement.idempotencyKey,
			);
			const terminationKey = scoped(
				input.settlement.organizationId,
				`termination:${input.settlement.terminationId}`,
			);
			if (
				state.settlements.has(input.settlement.id) ||
				state.itemKeys.has(key) ||
				state.itemKeys.has(terminationKey)
			) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					}),
				);
			}
			state.settlements.set(input.settlement.id, clone(input.settlement));
			state.itemKeys.set(key, input.settlement.id);
			state.itemKeys.set(terminationKey, input.settlement.id);
			return Promise.resolve(errorResult.ok(clone(input.settlement)));
		},
		findFinalSettlementByIdempotencyKey(input) {
			const settlementId = state.itemKeys.get(
				scoped(input.organizationId, input.idempotencyKey),
			);
			const settlement =
				settlementId === undefined
					? undefined
					: state.settlements.get(settlementId);
			return Promise.resolve(
				errorResult.ok(settlement === undefined ? null : clone(settlement)),
			);
		},
		getFinalSettlement(input) {
			const settlement = state.settlements.get(input.settlementId);
			return Promise.resolve(
				errorResult.ok(
					settlement?.organizationId === input.organizationId
						? clone(settlement)
						: null,
				),
			);
		},
		listFinalSettlementLines(input) {
			const lines = [...state.lines.values()]
				.filter(
					(line) =>
						line.organizationId === input.organizationId &&
						line.settlementId === input.settlementId,
				)
				.sort((left, right) => left.sequence - right.sequence)
				.map(clone);
			return Promise.resolve(errorResult.ok(lines));
		},
		saveFinalSettlementCalculation(input) {
			const saved = saveSettlement(state, input);
			if (!saved.ok) {
				return Promise.resolve(saved);
			}
			for (const [lineId, line] of state.lines) {
				if (line.settlementId === input.settlement.id) {
					state.lines.delete(lineId);
				}
			}
			for (const line of input.lines) {
				state.lines.set(line.id, clone(line));
			}
			return Promise.resolve(saved);
		},
		saveFinalSettlementTransition(input) {
			return Promise.resolve(saveSettlement(state, input));
		},
	};
}
