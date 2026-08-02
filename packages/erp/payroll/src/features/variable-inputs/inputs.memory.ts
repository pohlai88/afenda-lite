// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous payroll input ports.
import { randomUUID } from "node:crypto";

import { errorResult } from "@afenda/errors";
import type {
	IdempotentPayrollVariableInputRecord,
	PayrollVariableInput,
} from "../../kernel/contracts/projected-types";
import { recordPayrollAudit as recordAudit } from "../../kernel/execution/record-audit";
import {
	type PayrollVariableInputId,
	parsePayrollVariableInputId,
} from "../../kernel/identity/brands";
import {
	idempotencyMapKey,
	resolveCreateIdempotentReplay,
	resolveSourceIdempotentReplay,
} from "../../kernel/identity/source-idempotency";
import type { PayrollInputsStore } from "./inputs.store";

export interface InputsMemoryState {
	variableInputBySource: Map<string, IdempotentPayrollVariableInputRecord>;
	variableInputIdempotency: Map<string, IdempotentPayrollVariableInputRecord>;
	variableInputs: Map<PayrollVariableInputId, PayrollVariableInput>;
}

function cloneVariableInput(
	entity: PayrollVariableInput,
): PayrollVariableInput {
	return { ...entity };
}

export function createMemoryInputsMethods(
	state: InputsMemoryState,
): PayrollInputsStore {
	return {
		async findVariableInputBySource(input) {
			const key = `${input.organizationId}:${input.sourceType}:${input.sourceId}`;
			const record = state.variableInputBySource.get(key);
			if (record === undefined) {
				return errorResult.ok(null);
			}
			return errorResult.ok({
				variableInput: cloneVariableInput(record.variableInput),
				sourceRequestFingerprint: record.sourceRequestFingerprint,
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async findVariableInputByIdempotencyKey(input) {
			const record = state.variableInputIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return errorResult.ok(null);
			}
			return errorResult.ok({
				variableInput: cloneVariableInput(record.variableInput),
				sourceRequestFingerprint: record.sourceRequestFingerprint,
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors source idempotency, validation, audit, and rollback behavior.
		async createVariableInput(record, ports) {
			const bySource = await this.findVariableInputBySource({
				organizationId: record.organizationId,
				sourceType: record.sourceType,
				sourceId: record.sourceId,
			});
			if (!bySource.ok) {
				return bySource;
			}
			const sourceReplay = resolveSourceIdempotentReplay({
				existing:
					bySource.data === null
						? null
						: {
								entity: bySource.data.variableInput,
								sourceRequestFingerprint:
									bySource.data.sourceRequestFingerprint,
							},
				requestFingerprint: record.sourceRequestFingerprint,
			});
			if (!sourceReplay.ok) {
				return sourceReplay;
			}
			if (sourceReplay.data !== "create") {
				return errorResult.ok(cloneVariableInput(sourceReplay.data));
			}

			const byIdempotency = await this.findVariableInputByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!byIdempotency.ok) {
				return byIdempotency;
			}
			const idempotencyReplay = resolveCreateIdempotentReplay({
				existing:
					byIdempotency.data === null
						? null
						: {
								entity: byIdempotency.data.variableInput,
								createRequestFingerprint:
									byIdempotency.data.createRequestFingerprint,
							},
				requestFingerprint: record.createRequestFingerprint,
			});
			if (!idempotencyReplay.ok) {
				return idempotencyReplay;
			}
			if (idempotencyReplay.data !== "create") {
				return errorResult.ok(cloneVariableInput(idempotencyReplay.data));
			}

			const variableInputId = parsePayrollVariableInputId(randomUUID());
			if (!variableInputId.ok) {
				return variableInputId;
			}

			const now = new Date();
			const entity: PayrollVariableInput = {
				id: variableInputId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				payGroupId: record.payGroupId,
				periodId: record.periodId,
				earningRuleId: record.earningRuleId,
				earningRuleCode: record.earningRuleCode,
				earningRuleVersion: record.earningRuleVersion,
				amount: record.amount,
				currencyCode: record.currencyCode,
				sourceType: record.sourceType,
				sourceId: record.sourceId,
				status: "accepted",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo ?? null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.variableInputs.set(entity.id, entity);
			state.variableInputBySource.set(
				`${record.organizationId}:${record.sourceType}:${record.sourceId}`,
				{
					variableInput: entity,
					sourceRequestFingerprint: record.sourceRequestFingerprint,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);
			state.variableInputIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					variableInput: entity,
					sourceRequestFingerprint: record.sourceRequestFingerprint,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_variable_input",
				entityId: entity.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return errorResult.ok(cloneVariableInput(entity));
		},

		async getVariableInput(input) {
			const entity = state.variableInputs.get(input.variableInputId);
			if (
				entity === undefined ||
				entity.organizationId !== input.organizationId
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneVariableInput(entity));
		},

		async listVariableInputsForPeriod(input) {
			const variableInputs = Array.from(state.variableInputs.values()).filter(
				(entity) => {
					if (entity.organizationId !== input.organizationId) {
						return false;
					}
					if (entity.periodId !== input.periodId) {
						return false;
					}
					if (input.status !== undefined && entity.status !== input.status) {
						return false;
					}
					return true;
				},
			);
			return errorResult.ok(variableInputs.map(cloneVariableInput));
		},
	};
}
