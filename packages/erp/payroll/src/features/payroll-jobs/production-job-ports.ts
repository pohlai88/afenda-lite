import { errorResult, type Result } from "@afenda/errors";

import type {
	PayrollEmployeeAssignment,
	PayrollPeriod,
	PayrollRun,
} from "../../kernel/contracts/projected-types";
import {
	mapNotFound,
	mapPersistenceFailure,
} from "../../kernel/execution/persistence-errors";
import type {
	MutationPorts,
	PayrollRunCalculatorPort,
} from "../../kernel/execution/ports";
import {
	type PayrollPayGroupId,
	type PayrollPeriodId,
	type PayrollRunId,
	parsePayrollRunId,
} from "../../kernel/identity/brands";
import type {
	PayrollJobChunkExecutorPort,
	PayrollJobEmployeeDirectoryPort,
} from "./contract";

interface PayrollJobEmployeeStore {
	getPeriod: (input: {
		organizationId: string;
		periodId: PayrollPeriodId;
	}) => Promise<Result<PayrollPeriod | null>>;
	getRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollRun | null>>;
	listActiveAssignmentsForPayGroup: (input: {
		effectiveDate: string;
		organizationId: string;
		payGroupId: PayrollPayGroupId;
	}) => Promise<Result<PayrollEmployeeAssignment[]>>;
}

interface PayrollJobChunkStore {
	getRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollRun | null>>;
}

export function createProductionPayrollJobEmployeeDirectory(
	store: PayrollJobEmployeeStore,
): PayrollJobEmployeeDirectoryPort {
	return {
		async listEmployeeIdsForRun(input) {
			const runId = parsePayrollRunId(input.runId);
			if (!runId.ok) {
				return runId;
			}
			const run = await store.getRun({
				organizationId: input.organizationId,
				runId: runId.data,
			});
			if (!run.ok) {
				return run;
			}
			if (run.data === null) {
				return mapNotFound("Payroll run not found");
			}
			const period = await store.getPeriod({
				organizationId: input.organizationId,
				periodId: run.data.periodId,
			});
			if (!period.ok) {
				return period;
			}
			if (period.data === null) {
				return mapNotFound("Payroll period not found");
			}
			const assignments = await store.listActiveAssignmentsForPayGroup({
				organizationId: input.organizationId,
				payGroupId: run.data.payGroupId,
				effectiveDate: period.data.periodEnd,
			});
			if (!assignments.ok) {
				return assignments;
			}
			return errorResult.ok(
				[
					...new Set(
						assignments.data.map((assignment) => assignment.employeeId),
					),
				].sort((left, right) => left.localeCompare(right)),
			);
		},
	};
}

export function createProductionPayrollJobChunkExecutor(input: {
	calculator: PayrollRunCalculatorPort;
	ports: MutationPorts;
	store: PayrollJobChunkStore;
}): PayrollJobChunkExecutorPort {
	return {
		async executeChunk(
			chunk,
		): Promise<Result<{ processedEmployeeIds: readonly string[] }>> {
			const runId = parsePayrollRunId(chunk.runId);
			if (!runId.ok) {
				return runId;
			}
			const run = await input.store.getRun({
				organizationId: chunk.organizationId,
				runId: runId.data,
			});
			if (!run.ok) {
				return run;
			}
			if (run.data === null) {
				return mapNotFound("Payroll run not found");
			}
			try {
				const calculated = await input.calculator.calculate(
					{
						organizationId: chunk.organizationId,
						runId: runId.data,
						payGroupId: run.data.payGroupId,
						periodId: run.data.periodId,
						runType: run.data.runType,
						sequence: run.data.sequence,
						actorUserId: chunk.actorUserId,
						correlationId: chunk.correlationId,
						employeeIds: [...chunk.employeeIds],
					},
					input.ports,
				);
				if (!calculated.ok) {
					return calculated;
				}
				return errorResult.ok({
					processedEmployeeIds: chunk.employeeIds,
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to execute payroll job chunk",
				);
			}
		},
	};
}
