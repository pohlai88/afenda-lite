import {
	PAYROLL_ASSIGNMENT_COMMANDS,
	PAYROLL_ASSIGNMENT_QUERIES,
} from "../../features/employee-assignments/operation-registry";
import {
	PAYROLL_RUN_COMMANDS,
	PAYROLL_RUN_QUERIES,
} from "../../features/payroll-runs/operation-registry";
import {
	PAYROLL_SETUP_COMMANDS,
	PAYROLL_SETUP_QUERIES,
} from "../../features/payroll-setup/operation-registry";
import { PAYROLL_PAYSLIP_QUERIES } from "../../features/payslips/operation-registry";
import {
	PAYROLL_PRIVACY_COMMANDS,
	PAYROLL_PRIVACY_QUERIES,
} from "../../features/privacy/operation-registry";
import {
	PAYROLL_RECONCILIATION_COMMANDS,
	PAYROLL_RECONCILIATION_QUERIES,
} from "../../features/reconciliation/operation-registry";
import { PAYROLL_SETTLEMENT_INGRESS_COMMANDS } from "../../features/settlement-ingress/operation-registry";
import {
	PAYROLL_VARIABLE_INPUT_COMMANDS,
	PAYROLL_VARIABLE_INPUT_QUERIES,
} from "../../features/variable-inputs/operation-registry";
import { PAYROLL_WORKFORCE_INGRESS_COMMANDS } from "../../features/workforce-ingress/operation-registry";
import type { PayrollPermission } from "../execution/permissions";
import { composePayrollOperationRegistries } from "./define-registry";

// Fail-closed cross-feature validation (duplicate ids/public names throw).
composePayrollOperationRegistries(
	PAYROLL_SETUP_COMMANDS,
	PAYROLL_ASSIGNMENT_COMMANDS,
	PAYROLL_VARIABLE_INPUT_COMMANDS,
	PAYROLL_RUN_COMMANDS,
	PAYROLL_RECONCILIATION_COMMANDS,
	PAYROLL_SETTLEMENT_INGRESS_COMMANDS,
	PAYROLL_PRIVACY_COMMANDS,
	PAYROLL_WORKFORCE_INGRESS_COMMANDS,
	PAYROLL_SETUP_QUERIES,
	PAYROLL_ASSIGNMENT_QUERIES,
	PAYROLL_VARIABLE_INPUT_QUERIES,
	PAYROLL_RUN_QUERIES,
	PAYROLL_PAYSLIP_QUERIES,
	PAYROLL_PRIVACY_QUERIES,
	PAYROLL_RECONCILIATION_QUERIES,
);

/** Canonical Payroll operation identity, composed from feature registries. */
export const PAYROLL_OPERATION_DEFINITIONS = {
	...PAYROLL_SETUP_COMMANDS,
	...PAYROLL_ASSIGNMENT_COMMANDS,
	...PAYROLL_VARIABLE_INPUT_COMMANDS,
	...PAYROLL_RUN_COMMANDS,
	...PAYROLL_RECONCILIATION_COMMANDS,
	...PAYROLL_SETTLEMENT_INGRESS_COMMANDS,
	...PAYROLL_PRIVACY_COMMANDS,
	...PAYROLL_WORKFORCE_INGRESS_COMMANDS,
	...PAYROLL_SETUP_QUERIES,
	...PAYROLL_ASSIGNMENT_QUERIES,
	...PAYROLL_VARIABLE_INPUT_QUERIES,
	...PAYROLL_RUN_QUERIES,
	...PAYROLL_PAYSLIP_QUERIES,
	...PAYROLL_PRIVACY_QUERIES,
	...PAYROLL_RECONCILIATION_QUERIES,
} as const;

type PayrollOperation =
	(typeof PAYROLL_OPERATION_DEFINITIONS)[keyof typeof PAYROLL_OPERATION_DEFINITIONS];
type PayrollCommandOperation = Extract<PayrollOperation, { kind: "command" }>;
type PayrollQueryOperation = Extract<PayrollOperation, { kind: "query" }>;

const operationDefinitions = Object.values(PAYROLL_OPERATION_DEFINITIONS);
for (const definition of operationDefinitions) {
	Object.freeze(definition);
}
Object.freeze(PAYROLL_OPERATION_DEFINITIONS);

const operationIds = new Set(operationDefinitions.map(({ id }) => id));
if (operationIds.size !== operationDefinitions.length) {
	throw new Error("Payroll operation IDs must be unique");
}

const commandDefinitions = operationDefinitions.filter(
	(definition): definition is PayrollCommandOperation =>
		definition.kind === "command",
);
const queryDefinitions = operationDefinitions.filter(
	(definition): definition is PayrollQueryOperation =>
		definition.kind === "query",
);

function projectAuthorization<
	TDefinition extends {
		readonly id: string;
		readonly permission: PayrollPermission;
	},
>(definitions: readonly TDefinition[]) {
	return Object.freeze(
		Object.fromEntries(
			definitions.map(({ id, permission }) => [id, permission]),
		),
	) as Readonly<Record<TDefinition["id"], PayrollPermission>>;
}

export type PayrollCommandId = PayrollCommandOperation["id"];
export type PayrollQueryId = PayrollQueryOperation["id"];

export const PAYROLL_COMMAND_IDS = Object.freeze(
	commandDefinitions.map(({ id }) => id),
);
export const PAYROLL_QUERY_IDS = Object.freeze(
	queryDefinitions.map(({ id }) => id),
);
export const PAYROLL_COMMAND_AUTHORIZATION =
	projectAuthorization(commandDefinitions);
export const PAYROLL_QUERY_AUTHORIZATION =
	projectAuthorization(queryDefinitions);

export const PAYROLL_COMMAND_SETUP_CALENDAR_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createCalendar.id;
export const PAYROLL_COMMAND_SETUP_CALENDAR_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updateCalendar.id;
export const PAYROLL_COMMAND_SETUP_CALENDAR_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archiveCalendar.id;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createPayGroup.id;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updatePayGroup.id;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archivePayGroup.id;
export const PAYROLL_COMMAND_SETUP_PERIOD_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createPeriod.id;
export const PAYROLL_COMMAND_SETUP_PERIOD_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updatePeriod.id;
export const PAYROLL_COMMAND_SETUP_PERIOD_CLOSE =
	PAYROLL_OPERATION_DEFINITIONS.closePeriod.id;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createEarningRule.id;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updateEarningRule.id;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archiveEarningRule.id;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_SUPERSEDE =
	PAYROLL_OPERATION_DEFINITIONS.supersedeEarningRule.id;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createDeductionRule.id;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updateDeductionRule.id;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archiveDeductionRule.id;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_SUPERSEDE =
	PAYROLL_OPERATION_DEFINITIONS.supersedeDeductionRule.id;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createStatutoryRule.id;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updateStatutoryRule.id;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archiveStatutoryRule.id;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_SUPERSEDE =
	PAYROLL_OPERATION_DEFINITIONS.supersedeStatutoryRule.id;
export const PAYROLL_COMMAND_ASSIGNMENT_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createAssignment.id;
export const PAYROLL_COMMAND_ASSIGNMENT_RECURRING_EARNING_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createRecurringEarning.id;
export const PAYROLL_COMMAND_ASSIGNMENT_RECURRING_DEDUCTION_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createRecurringDeduction.id;
export const PAYROLL_COMMAND_INPUT_VARIABLE_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createVariableInput.id;
export const PAYROLL_COMMAND_RUN_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createRun.id;
export const PAYROLL_COMMAND_RUN_CALCULATE =
	PAYROLL_OPERATION_DEFINITIONS.calculateRun.id;
export const PAYROLL_COMMAND_RUN_FINALIZE =
	PAYROLL_OPERATION_DEFINITIONS.finalizeRun.id;
export const PAYROLL_COMMAND_RUN_REVERSE =
	PAYROLL_OPERATION_DEFINITIONS.reverseRun.id;
export const PAYROLL_COMMAND_RECONCILIATION_RECORD =
	PAYROLL_OPERATION_DEFINITIONS.recordReconciliation.id;
export const PAYROLL_COMMAND_RECONCILIATION_RESOLVE =
	PAYROLL_OPERATION_DEFINITIONS.resolveReconciliation.id;
export const PAYROLL_COMMAND_SETTLEMENT_PAYMENT_RECORD =
	PAYROLL_OPERATION_DEFINITIONS.recordPaymentSettlement.id;
export const PAYROLL_COMMAND_SETTLEMENT_POSTING_RECORD =
	PAYROLL_OPERATION_DEFINITIONS.recordPostingConfirmation.id;
export const PAYROLL_COMMAND_SETTLEMENT_DISCREPANCY_RESOLVE =
	PAYROLL_OPERATION_DEFINITIONS.resolveReconciliationDiscrepancy.id;
export const PAYROLL_COMMAND_WORKFORCE_INGEST =
	PAYROLL_OPERATION_DEFINITIONS.ingestApprovedPayrollHandoff.id;
export const PAYROLL_COMMAND_PRIVACY_RESTRICTION_PLACE =
	PAYROLL_OPERATION_DEFINITIONS.restrictPayrollSubject.id;
export const PAYROLL_COMMAND_PRIVACY_RESTRICTION_LIFT =
	PAYROLL_OPERATION_DEFINITIONS.liftPayrollRestriction.id;
export const PAYROLL_COMMAND_PRIVACY_RETENTION_RECORD =
	PAYROLL_OPERATION_DEFINITIONS.recordPayrollRetentionEvidence.id;
export const PAYROLL_COMMAND_PRIVACY_RETENTION_EXPIRE =
	PAYROLL_OPERATION_DEFINITIONS.expirePayrollRetention.id;

export const PAYROLL_QUERY_SETUP_CALENDAR_GET =
	PAYROLL_OPERATION_DEFINITIONS.getCalendar.id;
export const PAYROLL_QUERY_SETUP_CALENDAR_LIST =
	PAYROLL_OPERATION_DEFINITIONS.listCalendars.id;
export const PAYROLL_QUERY_SETUP_PAY_GROUP_GET =
	PAYROLL_OPERATION_DEFINITIONS.getPayGroup.id;
export const PAYROLL_QUERY_SETUP_PAY_GROUP_LIST =
	PAYROLL_OPERATION_DEFINITIONS.listPayGroups.id;
export const PAYROLL_QUERY_SETUP_PERIOD_GET =
	PAYROLL_OPERATION_DEFINITIONS.getPeriod.id;
export const PAYROLL_QUERY_SETUP_PERIOD_LIST =
	PAYROLL_OPERATION_DEFINITIONS.listPeriods.id;
export const PAYROLL_QUERY_SETUP_EARNING_RULE_GET =
	PAYROLL_OPERATION_DEFINITIONS.getEarningRule.id;
export const PAYROLL_QUERY_SETUP_DEDUCTION_RULE_GET =
	PAYROLL_OPERATION_DEFINITIONS.getDeductionRule.id;
export const PAYROLL_QUERY_SETUP_STATUTORY_RULE_GET =
	PAYROLL_OPERATION_DEFINITIONS.getStatutoryRule.id;
export const PAYROLL_QUERY_ASSIGNMENT_GET =
	PAYROLL_OPERATION_DEFINITIONS.getAssignment.id;
export const PAYROLL_QUERY_INPUT_VARIABLE_GET =
	PAYROLL_OPERATION_DEFINITIONS.getVariableInput.id;
export const PAYROLL_QUERY_RUN_GET = PAYROLL_OPERATION_DEFINITIONS.getRun.id;
export const PAYROLL_QUERY_PAYSLIP_READ_OWN =
	PAYROLL_OPERATION_DEFINITIONS.readOwnPayslip.id;
export const PAYROLL_QUERY_PAYSLIP_READ_ALL =
	PAYROLL_OPERATION_DEFINITIONS.readAllPayslips.id;
export const PAYROLL_QUERY_RECONCILIATION_LIST =
	PAYROLL_OPERATION_DEFINITIONS.listReconciliations.id;
export const PAYROLL_QUERY_PRIVACY_FIELDS_PROJECT =
	PAYROLL_OPERATION_DEFINITIONS.projectPayrollFields.id;
export const PAYROLL_QUERY_PRIVACY_SUBJECT_ACCESS =
	PAYROLL_OPERATION_DEFINITIONS.respondToPayrollSubjectAccess.id;
