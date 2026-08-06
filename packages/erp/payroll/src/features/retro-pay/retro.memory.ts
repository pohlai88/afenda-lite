import { errorResult } from "@afenda/errors";

import type { PayrollRetroItem, PayrollRetroLine } from "./contract";
import type { PayrollRetroStore } from "./retro.store";

const clone = <T>(value: T): T => structuredClone(value);

export interface RetroMemoryState {
	itemKeys: Map<string, string>;
	items: Map<string, PayrollRetroItem>;
	lines: Map<string, PayrollRetroLine>;
}

export function createRetroMemoryState(): RetroMemoryState {
	return {
		itemKeys: new Map(),
		items: new Map(),
		lines: new Map(),
	};
}

export function resetRetroMemoryState(state: RetroMemoryState): void {
	state.itemKeys.clear();
	state.items.clear();
	state.lines.clear();
}

function scoped(organizationId: string, value: string): string {
	return `${organizationId}:${value}`;
}

export function createMemoryRetroMethods(
	state: RetroMemoryState,
): PayrollRetroStore {
	return {
		createRetroItem(input) {
			const key = scoped(input.item.organizationId, input.item.idempotencyKey);
			if (state.items.has(input.item.id) || state.itemKeys.has(key)) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					}),
				);
			}
			state.items.set(input.item.id, clone(input.item));
			state.itemKeys.set(key, input.item.id);
			return Promise.resolve(errorResult.ok(clone(input.item)));
		},
		findRetroItemByIdempotencyKey(input) {
			const itemId = state.itemKeys.get(
				scoped(input.organizationId, input.idempotencyKey),
			);
			const item = itemId === undefined ? undefined : state.items.get(itemId);
			return Promise.resolve(
				errorResult.ok(item === undefined ? null : clone(item)),
			);
		},
		getRetroItem(input) {
			const item = state.items.get(input.retroItemId);
			return Promise.resolve(
				errorResult.ok(
					item?.organizationId === input.organizationId ? clone(item) : null,
				),
			);
		},
		listRetroItemViews(input) {
			const views = [...state.items.values()]
				.filter(
					(item) =>
						item.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							item.employeeId === input.employeeId) &&
						(input.originPeriodId === undefined ||
							item.originPeriodId === input.originPeriodId) &&
						(input.status === undefined || item.status === input.status) &&
						(input.targetRunId === undefined ||
							item.targetRunId === input.targetRunId),
				)
				.sort((left, right) => left.id.localeCompare(right.id))
				.map((item) => ({
					item: clone(item),
					lines: [...state.lines.values()]
						.filter((line) => line.retroItemId === item.id)
						.sort((left, right) => left.sequence - right.sequence)
						.map(clone),
				}));
			return Promise.resolve(errorResult.ok(views));
		},
		saveRetroDifference(input) {
			return Promise.resolve(saveItem(state, input));
		},
		applyRetroItem(input) {
			const saved = saveItem(state, input);
			if (!saved.ok) {
				return Promise.resolve(saved);
			}
			for (const line of input.lines) {
				state.lines.set(line.id, clone(line));
			}
			return Promise.resolve(saved);
		},
	};
}

function saveItem(
	state: RetroMemoryState,
	input: { expectedVersion: number; item: PayrollRetroItem },
) {
	const current = state.items.get(input.item.id);
	if (
		current === undefined ||
		current.organizationId !== input.item.organizationId ||
		current.version !== input.expectedVersion ||
		input.item.version !== input.expectedVersion + 1
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	state.items.set(input.item.id, clone(input.item));
	return errorResult.ok(clone(input.item));
}
