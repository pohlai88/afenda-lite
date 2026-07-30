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

export interface IdempotentEntityRecord<TEntity> {
	createRequestFingerprint: string;
	entity: TEntity;
}

export interface SetupMemoryState {
	calendarIdempotency: Map<string, IdempotentPayrollCalendarRecord>;
	calendars: Map<PayrollCalendarId, PayrollCalendar>;
	deductionRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollDeductionRule>
	>;
	deductionRules: Map<PayrollDeductionRuleId, PayrollDeductionRule>;
	earningRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollEarningRule>
	>;
	earningRules: Map<PayrollEarningRuleId, PayrollEarningRule>;
	payGroupIdempotency: Map<string, IdempotentEntityRecord<PayrollPayGroup>>;
	payGroups: Map<PayrollPayGroupId, PayrollPayGroup>;
	periodIdempotency: Map<string, IdempotentEntityRecord<PayrollPeriod>>;
	periods: Map<PayrollPeriodId, PayrollPeriod>;
	ruleFinalizedUsage: Set<string>;
	statutoryRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollStatutoryRule>
	>;
	statutoryRules: Map<PayrollStatutoryRuleId, PayrollStatutoryRule>;
}

export interface RunsMemoryState {
	exceptions: Map<PayrollExceptionId, PayrollException>;
	runIdempotency: Map<string, IdempotentPayrollRunRecord>;
	runs: Map<PayrollRunId, PayrollRun>;
}

export interface AssignmentsMemoryState {
	assignmentIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollEmployeeAssignment>
	>;
	assignments: Map<PayrollEmployeeAssignmentId, PayrollEmployeeAssignment>;
	recurringDeductionIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollRecurringDeduction>
	>;
	recurringDeductions: Map<
		PayrollRecurringDeductionId,
		PayrollRecurringDeduction
	>;
	recurringEarningIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollRecurringEarning>
	>;
	recurringEarnings: Map<PayrollRecurringEarningId, PayrollRecurringEarning>;
}

export interface InputsMemoryState {
	variableInputBySource: Map<string, IdempotentPayrollVariableInputRecord>;
	variableInputIdempotency: Map<string, IdempotentPayrollVariableInputRecord>;
	variableInputs: Map<PayrollVariableInputId, PayrollVariableInput>;
}

export interface OutputsMemoryState {
	resultLines: Map<PayrollResultLineId, PayrollResultLine>;
	runEmployees: Map<PayrollRunEmployeeId, PayrollRunEmployee>;
}

export interface StatutoryMemoryState {
	statutoryResults: Map<PayrollStatutoryResultId, PayrollStatutoryResult>;
}

export interface MemoryPayrollStoreState {
	assignments: AssignmentsMemoryState;
	inputs: InputsMemoryState;
	outputs: OutputsMemoryState;
	runs: RunsMemoryState;
	setup: SetupMemoryState;
	statutory: StatutoryMemoryState;
}

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

export function resetAssignmentsMemoryState(
	state: AssignmentsMemoryState,
): void {
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
