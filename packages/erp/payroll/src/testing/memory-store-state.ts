import type { OutputsMemoryState } from "../features/calculation/outputs.memory";
import type { AssignmentsMemoryState } from "../features/employee-assignments/assignments.memory";
import {
	createFinalSettlementMemoryState,
	type FinalSettlementMemoryState,
	resetFinalSettlementMemoryState,
} from "../features/final-settlement/settlement.memory";
import {
	createJobsMemoryState,
	type JobsMemoryState,
	resetJobsMemoryState,
} from "../features/payroll-jobs/jobs.memory";
import type { RunsMemoryState } from "../features/payroll-runs/runs.memory";
import type { SetupMemoryState } from "../features/payroll-setup/setup.memory";
import type { ReconciliationMemoryState } from "../features/reconciliation/reconciliation.memory";
import {
	createRetroMemoryState,
	type RetroMemoryState,
	resetRetroMemoryState,
} from "../features/retro-pay/retro.memory";
import {
	createStatutoryFilingMemoryState,
	resetStatutoryFilingMemoryState,
	type StatutoryFilingMemoryState,
} from "../features/statutory-filings/filing.memory";
import type { StatutoryMemoryState } from "../features/statutory-rules/statutory.memory";
import type { InputsMemoryState } from "../features/variable-inputs/inputs.memory";
import type { WorkforceIngressMemoryState } from "../features/workforce-ingress/accepted-handoff.memory";

export interface MemoryPayrollStoreState {
	assignments: AssignmentsMemoryState;
	finalSettlement: FinalSettlementMemoryState;
	inputs: InputsMemoryState;
	jobs: JobsMemoryState;
	outputs: OutputsMemoryState;
	reconciliation: ReconciliationMemoryState;
	retro: RetroMemoryState;
	runs: RunsMemoryState;
	setup: SetupMemoryState;
	statutory: StatutoryMemoryState;
	statutoryFilings: StatutoryFilingMemoryState;
	workforceIngress: WorkforceIngressMemoryState;
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
		adjustments: new Map(),
		runs: new Map(),
		runIdempotency: new Map(),
		exceptions: new Map(),
	};
}

export function resetRunsMemoryState(state: RunsMemoryState): void {
	state.adjustments.clear();
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

export function createReconciliationMemoryState(): ReconciliationMemoryState {
	return { reconciliations: new Map(), idempotency: new Map() };
}

export function resetReconciliationMemoryState(
	state: ReconciliationMemoryState,
): void {
	state.reconciliations.clear();
	state.idempotency.clear();
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
		reconciliation: createReconciliationMemoryState(),
		retro: createRetroMemoryState(),
		finalSettlement: createFinalSettlementMemoryState(),
		statutoryFilings: createStatutoryFilingMemoryState(),
		jobs: createJobsMemoryState(),
		workforceIngress: { acceptedHandoffs: new Map() },
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
	resetReconciliationMemoryState(state.reconciliation);
	resetRetroMemoryState(state.retro);
	resetFinalSettlementMemoryState(state.finalSettlement);
	resetStatutoryFilingMemoryState(state.statutoryFilings);
	resetJobsMemoryState(state.jobs);
	state.workforceIngress.acceptedHandoffs.clear();
}
