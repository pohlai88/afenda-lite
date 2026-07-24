import type {
	PayrollCalendarId,
	PayrollDeductionRuleId,
	PayrollEarningRuleId,
	PayrollEmployeeAssignmentId,
	PayrollExceptionId,
	PayrollPayGroupId,
	PayrollPeriodId,
	PayrollRecurringDeductionId,
	PayrollRecurringEarningId,
	PayrollResultLineId,
	PayrollRunEmployeeId,
	PayrollRunId,
	PayrollStatutoryResultId,
	PayrollStatutoryRuleId,
	PayrollVariableInputId,
} from "../../brands";
import type {
	IdempotentPayrollCalendarRecord,
	IdempotentPayrollRunRecord,
	IdempotentPayrollVariableInputRecord,
	PayrollCalendar,
	PayrollDeductionRule,
	PayrollEarningRule,
	PayrollEmployeeAssignment,
	PayrollException,
	PayrollPayGroup,
	PayrollPeriod,
	PayrollRecurringDeduction,
	PayrollRecurringEarning,
	PayrollResultLine,
	PayrollRun,
	PayrollRunEmployee,
	PayrollStatutoryResult,
	PayrollStatutoryRule,
	PayrollVariableInput,
} from "../../types";

/** Tenant-scoped idempotency key for in-memory Maps. */
export function idempotencyMapKey(
	organizationId: string,
	idempotencyKey: string,
): string {
	return `${organizationId}:${idempotencyKey}`;
}

export type IdempotentEntityRecord<TEntity> = {
	entity: TEntity;
	createRequestFingerprint: string;
};

export type SetupMemoryState = {
	calendars: Map<PayrollCalendarId, PayrollCalendar>;
	calendarIdempotency: Map<string, IdempotentPayrollCalendarRecord>;
	payGroups: Map<PayrollPayGroupId, PayrollPayGroup>;
	payGroupIdempotency: Map<string, IdempotentEntityRecord<PayrollPayGroup>>;
	periods: Map<PayrollPeriodId, PayrollPeriod>;
	periodIdempotency: Map<string, IdempotentEntityRecord<PayrollPeriod>>;
	earningRules: Map<PayrollEarningRuleId, PayrollEarningRule>;
	earningRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollEarningRule>
	>;
	deductionRules: Map<PayrollDeductionRuleId, PayrollDeductionRule>;
	deductionRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollDeductionRule>
	>;
	statutoryRules: Map<PayrollStatutoryRuleId, PayrollStatutoryRule>;
	statutoryRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollStatutoryRule>
	>;
	ruleFinalizedUsage: Set<string>;
};

export type RunsMemoryState = {
	runs: Map<PayrollRunId, PayrollRun>;
	runIdempotency: Map<string, IdempotentPayrollRunRecord>;
	exceptions: Map<PayrollExceptionId, PayrollException>;
};

export type AssignmentsMemoryState = {
	assignments: Map<PayrollEmployeeAssignmentId, PayrollEmployeeAssignment>;
	assignmentIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollEmployeeAssignment>
	>;
	recurringEarnings: Map<PayrollRecurringEarningId, PayrollRecurringEarning>;
	recurringEarningIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollRecurringEarning>
	>;
	recurringDeductions: Map<
		PayrollRecurringDeductionId,
		PayrollRecurringDeduction
	>;
	recurringDeductionIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollRecurringDeduction>
	>;
};

export type InputsMemoryState = {
	variableInputs: Map<PayrollVariableInputId, PayrollVariableInput>;
	variableInputBySource: Map<string, IdempotentPayrollVariableInputRecord>;
	variableInputIdempotency: Map<string, IdempotentPayrollVariableInputRecord>;
};

export type OutputsMemoryState = {
	runEmployees: Map<PayrollRunEmployeeId, PayrollRunEmployee>;
	resultLines: Map<PayrollResultLineId, PayrollResultLine>;
};

export type StatutoryMemoryState = {
	statutoryResults: Map<PayrollStatutoryResultId, PayrollStatutoryResult>;
};

export type MemoryPayrollStoreState = {
	setup: SetupMemoryState;
	assignments: AssignmentsMemoryState;
	inputs: InputsMemoryState;
	runs: RunsMemoryState;
	outputs: OutputsMemoryState;
	statutory: StatutoryMemoryState;
};

export function createSetupMemoryState(): SetupMemoryState {
	return {
		calendars: new Map(),
		calendarIdempotency: new Map(),
		payGroups: new Map(),
		payGroupIdempotency: new Map(),
		periods: new Map(),
		periodIdempotency: new Map(),
		earningRules: new Map(),
		earningRuleIdempotency: new Map(),
		deductionRules: new Map(),
		deductionRuleIdempotency: new Map(),
		statutoryRules: new Map(),
		statutoryRuleIdempotency: new Map(),
		ruleFinalizedUsage: new Set(),
	};
}

export function resetSetupMemoryState(state: SetupMemoryState): void {
	state.calendars.clear();
	state.calendarIdempotency.clear();
	state.payGroups.clear();
	state.payGroupIdempotency.clear();
	state.periods.clear();
	state.periodIdempotency.clear();
	state.earningRules.clear();
	state.earningRuleIdempotency.clear();
	state.deductionRules.clear();
	state.deductionRuleIdempotency.clear();
	state.statutoryRules.clear();
	state.statutoryRuleIdempotency.clear();
	state.ruleFinalizedUsage.clear();
}

export function createRunsMemoryState(): RunsMemoryState {
	return {
		runs: new Map(),
		runIdempotency: new Map(),
		exceptions: new Map(),
	};
}

export function resetRunsMemoryState(state: RunsMemoryState): void {
	state.runs.clear();
	state.runIdempotency.clear();
	state.exceptions.clear();
}

export function createAssignmentsMemoryState(): AssignmentsMemoryState {
	return {
		assignments: new Map(),
		assignmentIdempotency: new Map(),
		recurringEarnings: new Map(),
		recurringEarningIdempotency: new Map(),
		recurringDeductions: new Map(),
		recurringDeductionIdempotency: new Map(),
	};
}

export function resetAssignmentsMemoryState(state: AssignmentsMemoryState): void {
	state.assignments.clear();
	state.assignmentIdempotency.clear();
	state.recurringEarnings.clear();
	state.recurringEarningIdempotency.clear();
	state.recurringDeductions.clear();
	state.recurringDeductionIdempotency.clear();
}

export function createInputsMemoryState(): InputsMemoryState {
	return {
		variableInputs: new Map(),
		variableInputBySource: new Map(),
		variableInputIdempotency: new Map(),
	};
}

export function resetInputsMemoryState(state: InputsMemoryState): void {
	state.variableInputs.clear();
	state.variableInputBySource.clear();
	state.variableInputIdempotency.clear();
}

export function createOutputsMemoryState(): OutputsMemoryState {
	return {
		runEmployees: new Map(),
		resultLines: new Map(),
	};
}

export function resetOutputsMemoryState(state: OutputsMemoryState): void {
	state.runEmployees.clear();
	state.resultLines.clear();
}

export function createStatutoryMemoryState(): StatutoryMemoryState {
	return {
		statutoryResults: new Map(),
	};
}

export function resetStatutoryMemoryState(state: StatutoryMemoryState): void {
	state.statutoryResults.clear();
}

export function createMemoryPayrollStoreState(): MemoryPayrollStoreState {
	return {
		setup: createSetupMemoryState(),
		assignments: createAssignmentsMemoryState(),
		inputs: createInputsMemoryState(),
		runs: createRunsMemoryState(),
		outputs: createOutputsMemoryState(),
		statutory: createStatutoryMemoryState(),
	};
}

export function resetMemoryPayrollStoreState(
	state: MemoryPayrollStoreState,
): void {
	resetSetupMemoryState(state.setup);
	resetAssignmentsMemoryState(state.assignments);
	resetInputsMemoryState(state.inputs);
	resetRunsMemoryState(state.runs);
	resetOutputsMemoryState(state.outputs);
	resetStatutoryMemoryState(state.statutory);
}
