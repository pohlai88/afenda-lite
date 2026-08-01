import { randomUUID } from "node:crypto";

import { errorResult } from "@afenda/errors";

import {
	parsePayrollResultLineId,
	parsePayrollRunEmployeeId,
	parsePayrollStatutoryResultId,
} from "../brands";
import type {
	PayrollEmployeeQueryPort,
	PayrollRunCalculatorPort,
} from "../ports";
import { payrollJsonObjectSchema } from "../schemas/common";
import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
	type PayrollRoundingPolicy,
} from "../shared/rounding-policy";
import { isStatutoryCalculatorProductionApproved } from "../statutory/calculators/registry";
import type { PayrollStore } from "../store";
import type {
	PayrollDeductionRule,
	PayrollEarningRule,
	PayrollResultLineCreateRecord,
	PayrollRunEmployeeCreateRecord,
	PayrollStatutoryResultCreateRecord,
	PayrollStatutoryRule,
} from "../types";
import type {
	PayrollCalcDeductionRuleSnapshot,
	PayrollCalcEarningRuleSnapshot,
	PayrollCalcStatutoryRuleSnapshot,
	PayrollEmployeeCalcSnapshot,
} from "./calc/types";
import {
	calculateEmployeePayroll,
	hashSnapshot,
	normalizeCalcOutput,
	verifyAccountingIdentities,
} from "./calculation";

function mapEarningRule(
	rule: PayrollEarningRule,
): PayrollCalcEarningRuleSnapshot {
	return {
		id: rule.id,
		code: rule.code,
		name: rule.name,
		ruleType: rule.ruleType,
		amount: rule.amount,
		rate: rule.rate,
		recordVersion: rule.version,
		currencyCode: rule.currencyCode,
		ruleVersion: rule.ruleVersion,
	};
}

function mapDeductionRule(
	rule: PayrollDeductionRule,
): PayrollCalcDeductionRuleSnapshot {
	return {
		id: rule.id,
		code: rule.code,
		name: rule.name,
		ruleType: rule.ruleType,
		amount: rule.amount,
		rate: rule.rate,
		recordVersion: rule.version,
		currencyCode: rule.currencyCode,
		ruleVersion: rule.ruleVersion,
		taxTiming: rule.taxTiming,
	};
}

function mapStatutoryRule(
	rule: PayrollStatutoryRule,
): PayrollCalcStatutoryRuleSnapshot {
	return {
		id: rule.id,
		code: rule.code,
		name: rule.name,
		recordVersion: rule.version,
		jurisdictionCode: rule.jurisdictionCode,
		configJson: rule.configJson,
		ruleVersion: rule.ruleVersion,
	};
}

function compareCanonicalRecords(
	left: { id: string; code?: string },
	right: { id: string; code?: string },
): number {
	const code = (left.code ?? "").localeCompare(right.code ?? "");
	return code === 0 ? left.id.localeCompare(right.id) : code;
}

export function createProductionPayrollRunCalculator(input: {
	store: PayrollStore;
	employees: PayrollEmployeeQueryPort;
	roundingPolicy?: PayrollRoundingPolicy;
}): PayrollRunCalculatorPort {
	const roundingPolicy =
		input.roundingPolicy ?? DEFAULT_PAYROLL_ROUNDING_POLICY;

	return {
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This fail-closed coordinator keeps load, calculation, evidence aggregation, and replacement persistence visibly ordered.
		async calculate(calcInput, ports) {
			const period = await input.store.getPeriod({
				organizationId: calcInput.organizationId,
				periodId: calcInput.periodId,
			});
			if (!period.ok) {
				return period;
			}
			if (period.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Payroll period not found",
				});
			}

			const payGroup = await input.store.getPayGroup({
				organizationId: calcInput.organizationId,
				payGroupId: calcInput.payGroupId,
			});
			if (!payGroup.ok) {
				return payGroup;
			}
			if (payGroup.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Pay group not found",
				});
			}

			const effectiveDate = period.data.periodEnd;

			const [
				assignments,
				earningRules,
				deductionRules,
				statutoryRules,
				variableInputs,
			] = await Promise.all([
				input.store.listActiveAssignmentsForPayGroup({
					organizationId: calcInput.organizationId,
					payGroupId: calcInput.payGroupId,
					effectiveDate,
				}),
				input.store.listActiveEarningRulesForPayGroup({
					organizationId: calcInput.organizationId,
					payGroupId: calcInput.payGroupId,
					effectiveDate,
				}),
				input.store.listActiveDeductionRulesForPayGroup({
					organizationId: calcInput.organizationId,
					payGroupId: calcInput.payGroupId,
					effectiveDate,
				}),
				input.store.listActiveStatutoryRulesForPayGroup({
					organizationId: calcInput.organizationId,
					payGroupId: calcInput.payGroupId,
					effectiveDate,
				}),
				input.store.listVariableInputsForPeriod({
					organizationId: calcInput.organizationId,
					periodId: calcInput.periodId,
				}),
			]);

			for (const result of [
				assignments,
				earningRules,
				deductionRules,
				statutoryRules,
				variableInputs,
			]) {
				if (!result.ok) {
					return result;
				}
			}
			if (
				!(
					assignments.ok &&
					earningRules.ok &&
					deductionRules.ok &&
					statutoryRules.ok &&
					variableInputs.ok
				)
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			if (
				statutoryRules.data.some((rule) => {
					const { calculatorId } = rule.configJson;
					return (
						typeof calculatorId !== "string" ||
						!isStatutoryCalculatorProductionApproved(calculatorId)
					);
				})
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Payroll statutory calculation is not approved for production",
				});
			}

			const employeeFilter =
				calcInput.employeeIds === undefined
					? null
					: new Set(calcInput.employeeIds);

			const selectedAssignments = assignments.data
				.filter((assignment) =>
					employeeFilter === null
						? true
						: employeeFilter.has(assignment.employeeId),
				)
				.sort((left, right) => {
					const employee = left.employeeId.localeCompare(right.employeeId);
					return employee === 0 ? left.id.localeCompare(right.id) : employee;
				});

			const earningRuleSnapshots = earningRules.data
				.map(mapEarningRule)
				.sort(compareCanonicalRecords);
			const deductionRuleSnapshots = deductionRules.data
				.map(mapDeductionRule)
				.sort(compareCanonicalRecords);
			const statutoryRuleSnapshots = statutoryRules.data
				.map(mapStatutoryRule)
				.sort(compareCanonicalRecords);
			const assignmentContexts = await Promise.all(
				selectedAssignments.map(async (assignment) => {
					const [employeeFacts, recurringEarnings, recurringDeductions] =
						await Promise.all([
							input.employees.getPayrollEmployee({
								organizationId: calcInput.organizationId,
								employeeId: assignment.employeeId,
								effectiveDate,
								actorUserId: calcInput.actorUserId,
								correlationId: calcInput.correlationId,
							}),
							input.store.listRecurringEarningsForAssignment({
								organizationId: calcInput.organizationId,
								assignmentId: assignment.id,
								effectiveDate,
							}),
							input.store.listRecurringDeductionsForAssignment({
								organizationId: calcInput.organizationId,
								assignmentId: assignment.id,
								effectiveDate,
							}),
						]);
					return {
						assignment,
						employeeFacts,
						recurringEarnings,
						recurringDeductions,
					};
				}),
			);

			const runEmployees: PayrollRunEmployeeCreateRecord[] = [];
			const resultLines: PayrollResultLineCreateRecord[] = [];
			const statutoryResults: PayrollStatutoryResultCreateRecord[] = [];

			const aggregateExceptions: import("../ports").PayrollRunCalculatorException[] =
				[];
			const snapshotHashes: string[] = [];

			for (const context of assignmentContexts) {
				const {
					assignment,
					employeeFacts,
					recurringEarnings,
					recurringDeductions,
				} = context;
				if (!employeeFacts.ok) {
					return employeeFacts;
				}
				if (employeeFacts.data === null) {
					aggregateExceptions.push({
						severity: "blocking",
						exceptionCode: "EMPLOYEE_NOT_FOUND",
						message: "Employee not found for payroll at effective date",
						employeeRef: assignment.employeeId,
					});
					continue;
				}
				const payrollEmployee = employeeFacts.data;
				if (!recurringEarnings.ok) {
					return recurringEarnings;
				}
				if (!recurringDeductions.ok) {
					return recurringDeductions;
				}

				const employeeVariableInputs = variableInputs.data.filter(
					(entry) =>
						entry.employeeId === assignment.employeeId &&
						entry.status === "accepted",
				);

				const snapshot: PayrollEmployeeCalcSnapshot = {
					organizationId: calcInput.organizationId,
					employeeId: assignment.employeeId,
					assignmentId: assignment.id,
					payGroupId: calcInput.payGroupId,
					periodId: calcInput.periodId,
					currencyCode: payGroup.data.currencyCode,
					calculationVersion: PAYROLL_CALCULATION_VERSION,
					roundingPolicy,
					eligibility: {
						eligible:
							payrollEmployee.employmentStatus !== "terminated" &&
							payrollEmployee.currencyCode === payGroup.data.currencyCode,
						reason: null,
					},
					employee: {
						...payrollEmployee,
						recurringAllowances: [...payrollEmployee.recurringAllowances].sort(
							(left, right) => left.code.localeCompare(right.code),
						),
						recurringDeductions: [...payrollEmployee.recurringDeductions].sort(
							(left, right) => left.code.localeCompare(right.code),
						),
					},
					recurringEarnings: [...recurringEarnings.data]
						.sort(compareCanonicalRecords)
						.map((line) => ({
							id: line.id,
							earningRuleId: line.earningRuleId,
							earningRuleCode:
								earningRules.data.find((rule) => rule.id === line.earningRuleId)
									?.code ?? line.earningRuleId,
							earningRuleVersion:
								earningRules.data.find((rule) => rule.id === line.earningRuleId)
									?.ruleVersion ?? "unknown",
							amount: line.amount,
							currencyCode: line.currencyCode,
						})),
					recurringDeductions: [...recurringDeductions.data]
						.sort(compareCanonicalRecords)
						.map((line) => ({
							id: line.id,
							deductionRuleId: line.deductionRuleId,
							deductionRuleCode:
								deductionRules.data.find(
									(rule) => rule.id === line.deductionRuleId,
								)?.code ?? line.deductionRuleId,
							deductionRuleVersion:
								deductionRules.data.find(
									(rule) => rule.id === line.deductionRuleId,
								)?.ruleVersion ?? "unknown",
							amount: line.amount,
							currencyCode: line.currencyCode,
						})),
					variableInputs: employeeVariableInputs
						.sort(compareCanonicalRecords)
						.map((entry) => ({
							id: entry.id,
							earningRuleId: entry.earningRuleId,
							earningRuleCode: entry.earningRuleCode,
							earningRuleVersion: entry.earningRuleVersion,
							amount: entry.amount,
							currencyCode: entry.currencyCode,
							sourceType: entry.sourceType,
							sourceId: entry.sourceId,
						})),
					earningRules: earningRuleSnapshots,
					deductionRules: deductionRuleSnapshots,
					statutoryRules: statutoryRuleSnapshots,
				};

				const parsedSnapshot = payrollJsonObjectSchema.safeParse(snapshot);
				if (!parsedSnapshot.success) {
					return errorResult.fail("INTERNAL_ERROR");
				}

				const snapshotHash = hashSnapshot(parsedSnapshot.data);
				snapshotHashes.push(snapshotHash);

				const rawOutput = calculateEmployeePayroll(snapshot);
				const normalized = normalizeCalcOutput(rawOutput);
				const identity = verifyAccountingIdentities(normalized);
				if (!identity.valid) {
					for (const violation of identity.violations) {
						aggregateExceptions.push({
							severity: "blocking",
							exceptionCode: "ACCOUNTING_IDENTITY",
							message: violation,
							employeeRef: assignment.employeeId,
						});
					}
				}

				for (const exception of normalized.exceptions) {
					aggregateExceptions.push({
						severity: exception.severity,
						exceptionCode: exception.exceptionCode,
						message: exception.message,
						employeeRef: exception.sourceRef ?? assignment.employeeId,
					});
				}

				const runEmployeeId = parsePayrollRunEmployeeId(randomUUID());
				if (!runEmployeeId.ok) {
					return runEmployeeId;
				}

				const hasBlocking = normalized.exceptions.some(
					(entry) => entry.severity === "blocking",
				);

				runEmployees.push({
					id: runEmployeeId.data,
					employeeId: assignment.employeeId,
					assignmentId: assignment.id,
					currencyCode: normalized.currencyCode,
					gross: normalized.totals.gross,
					employeeDeductions: normalized.totals.employeeDeductions,
					employeeStatutory: normalized.totals.employeeStatutory,
					employerCost: normalized.totals.employerCost,
					net: normalized.totals.net,
					snapshotJson: parsedSnapshot.data,
					snapshotHash,
					calculationVersion: PAYROLL_CALCULATION_VERSION,
					status: hasBlocking ? "failed" : "calculated",
				});

				for (const line of normalized.lines) {
					const lineId = parsePayrollResultLineId(randomUUID());
					if (!lineId.ok) {
						return lineId;
					}
					resultLines.push({
						id: lineId.data,
						runEmployeeId: runEmployeeId.data,
						employeeId: assignment.employeeId,
						lineKind: line.lineKind,
						code: line.code,
						ruleCode: line.ruleCode,
						ruleVersion: line.ruleVersion,
						ruleKind: line.ruleKind,
						amount: line.amount,
						currencyCode: line.currencyCode,
						sourceType: line.sourceType,
						sourceId: line.sourceId,
						sequence: line.sequence,
						traceRef: line.traceRef,
					});
				}

				for (const statutory of normalized.statutoryResults) {
					const statutoryId = parsePayrollStatutoryResultId(randomUUID());
					if (!statutoryId.ok) {
						return statutoryId;
					}
					statutoryResults.push({
						id: statutoryId.data,
						runEmployeeId: runEmployeeId.data,
						employeeId: assignment.employeeId,
						jurisdictionCode: statutory.jurisdictionCode,
						ruleCode: statutory.ruleCode,
						ruleVersion: statutory.ruleVersion,
						calculatorId: statutory.calculatorId,
						baseAmount: statutory.baseAmount,
						employeeAmount: statutory.employeeAmount,
						employerAmount: statutory.employerAmount,
						currencyCode: statutory.currencyCode,
						configSnapshotJson: statutory.configSnapshotJson,
					});
				}
			}

			const bundleHash = hashSnapshot({
				runId: calcInput.runId,
				calculationVersion: PAYROLL_CALCULATION_VERSION,
				roundingPolicy,
				snapshotHashes: [...snapshotHashes].sort(),
			});

			const clearedOutputs = await input.store.deleteCalculationOutputsForRun(
				{
					organizationId: calcInput.organizationId,
					runId: calcInput.runId,
					actorUserId: calcInput.actorUserId,
					correlationId: calcInput.correlationId,
				},
				ports,
			);
			if (!clearedOutputs.ok) {
				return clearedOutputs;
			}

			if (runEmployees.length > 0) {
				const persisted = await input.store.replaceRunCalculationOutputs(
					{
						organizationId: calcInput.organizationId,
						runId: calcInput.runId,
						runEmployees,
						resultLines,
						actorUserId: calcInput.actorUserId,
						correlationId: calcInput.correlationId,
					},
					ports,
				);
				if (!persisted.ok) {
					return persisted;
				}
			}

			const persistedStatutory =
				await input.store.replaceStatutoryResultsForRun(
					{
						organizationId: calcInput.organizationId,
						runId: calcInput.runId,
						results: statutoryResults,
						actorUserId: calcInput.actorUserId,
						correlationId: calcInput.correlationId,
					},
					ports,
				);
			if (!persistedStatutory.ok) {
				return persistedStatutory;
			}

			return errorResult.ok({
				calculationSnapshotHash: bundleHash,
				calculationVersion: PAYROLL_CALCULATION_VERSION,
				roundingPolicyJson: { ...roundingPolicy },
				exceptions: aggregateExceptions,
			});
		},
	};
}
