import { errorResult, type Result } from "@afenda/errors";
import { events } from "@afenda/events";

import type { MutationPorts } from "../../kernel/execution/ports";
import { recordPayrollAudit as recordAudit } from "../../kernel/execution/record-audit";
import type {
	PayrollFinalSettlement,
	PayrollFinalSettlementLine,
} from "./contract";
import type { PayrollFinalSettlementStore } from "./settlement.store";
import {
	buildPayrollFinalSettlementEventPayload,
	payrollFinalSettlementEventForStatus,
} from "./settlement-lifecycle-events";

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

function restoreSettlementSnapshot(
	state: FinalSettlementMemoryState,
	previous: PayrollFinalSettlement,
	previousLines?: readonly PayrollFinalSettlementLine[],
): void {
	state.settlements.set(previous.id, clone(previous));
	if (previousLines === undefined) {
		return;
	}
	for (const [lineId, line] of state.lines) {
		if (line.settlementId === previous.id) {
			state.lines.delete(lineId);
		}
	}
	for (const line of previousLines) {
		state.lines.set(line.id, clone(line));
	}
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

function recordSettlementLifecycleFacts(
	ports: MutationPorts,
	input: {
		action: "CREATE" | "UPDATE";
		actorUserId: string;
		correlationId: string;
		organizationId: string;
		settlement: PayrollFinalSettlement;
		previousStatus?: PayrollFinalSettlement["status"];
	},
): Promise<Result<void>> {
	const work = async (): Promise<Result<void>> => {
		const eventType = payrollFinalSettlementEventForStatus(
			input.settlement.status,
		);
		const payload = buildPayrollFinalSettlementEventPayload({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			settlementId: input.settlement.id,
		});
		if (
			!events.registry.validatePayload(eventType, payload).success ||
			events.registry.sourceModule(eventType) !== "payroll"
		) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		const audit = await recordAudit(ports, {
			action: input.action,
			actorUserId: input.actorUserId,
			changes:
				input.previousStatus === undefined ||
				input.previousStatus === input.settlement.status
					? []
					: [
							{
								field: "status",
								oldValue: input.previousStatus,
								newValue: input.settlement.status,
							},
						],
			correlationId: input.correlationId,
			entity: "payroll_final_settlement",
			entityId: input.settlement.id,
			organizationId: input.organizationId,
		});
		if (!audit.ok) {
			return audit;
		}
		const outbox = await ports.outbox.append({
			type: eventType,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			payload,
		});
		if (!outbox.ok) {
			return outbox;
		}
		return errorResult.ok(undefined);
	};
	return ports.transaction === undefined
		? work()
		: ports.transaction.execute(work);
}

export function createMemoryFinalSettlementMethods(
	state: FinalSettlementMemoryState,
): PayrollFinalSettlementStore {
	return {
		async createFinalSettlement(input, ports) {
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			state.settlements.set(input.settlement.id, clone(input.settlement));
			state.itemKeys.set(key, input.settlement.id);
			state.itemKeys.set(terminationKey, input.settlement.id);
			const facts = await recordSettlementLifecycleFacts(ports, {
				action: "CREATE",
				actorUserId: input.settlement.createdBy,
				correlationId: input.settlement.correlationId,
				organizationId: input.settlement.organizationId,
				settlement: input.settlement,
			});
			if (!facts.ok) {
				state.settlements.delete(input.settlement.id);
				state.itemKeys.delete(key);
				state.itemKeys.delete(terminationKey);
				return facts;
			}
			return errorResult.ok(clone(input.settlement));
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
		async saveFinalSettlementCalculation(input, ports) {
			const previous = state.settlements.get(input.settlement.id);
			if (previous === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			const previousLines = [...state.lines.values()].filter(
				(line) => line.settlementId === input.settlement.id,
			);
			const saved = saveSettlement(state, input);
			if (!saved.ok) {
				return saved;
			}
			for (const [lineId, line] of state.lines) {
				if (line.settlementId === input.settlement.id) {
					state.lines.delete(lineId);
				}
			}
			for (const line of input.lines) {
				state.lines.set(line.id, clone(line));
			}
			const facts = await recordSettlementLifecycleFacts(ports, {
				action: "UPDATE",
				actorUserId: input.settlement.updatedBy,
				correlationId: input.settlement.correlationId,
				organizationId: input.settlement.organizationId,
				previousStatus: previous.status,
				settlement: input.settlement,
			});
			if (!facts.ok) {
				restoreSettlementSnapshot(state, previous, previousLines);
				return facts;
			}
			return saved;
		},
		async saveFinalSettlementTransition(input, ports) {
			const previous = state.settlements.get(input.settlement.id);
			if (previous === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			const saved = saveSettlement(state, input);
			if (!saved.ok) {
				return saved;
			}
			const facts = await recordSettlementLifecycleFacts(ports, {
				action: "UPDATE",
				actorUserId: input.settlement.updatedBy,
				correlationId: input.settlement.correlationId,
				organizationId: input.settlement.organizationId,
				previousStatus: previous.status,
				settlement: input.settlement,
			});
			if (!facts.ok) {
				restoreSettlementSnapshot(state, previous);
				return facts;
			}
			return saved;
		},
	};
}
