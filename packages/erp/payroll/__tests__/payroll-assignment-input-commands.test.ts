import { describe, expect, it } from "vitest";

import { createPayrollEmployeeAssignment } from "../src/features/employee-assignments/employee-payroll-assignment";
import { createPayrollRecurringDeduction } from "../src/features/employee-assignments/recurring-deduction";
import { createPayrollRecurringEarning } from "../src/features/employee-assignments/recurring-earning";
import { createPayrollPeriod } from "../src/features/payroll-runs/payroll-period";
import { createPayrollCalendar } from "../src/features/payroll-setup/calendar";
import { createPayrollDeductionRule } from "../src/features/payroll-setup/deduction-rule";
import { createPayrollEarningRule } from "../src/features/payroll-setup/earning-rule";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import { createPayrollVariableInput } from "../src/features/variable-inputs/variable-input";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/kernel/execution/permissions";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryPayrollEmployeeQueryPort } from "./helpers/memory-employee-port";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

function createGrantingAuthorization(
	permissions: string[],
): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) => permissions.includes(permission),
	};
}

function createDenyingAuthorization(): PayrollAuthorizationPort {
	return {
		can: async () => false,
	};
}

function baseContext(organizationId: string, actorUserId: string) {
	return {
		organizationId,
		actorUserId,
		correlationId: "corr-phase4",
	};
}

async function seedSetupChain(
	organizationId: string,
	actorUserId: string,
	suffix: string,
) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingAuthorization([
		PAYROLL_PERMISSION_SETUP_MANAGE,
		PAYROLL_PERMISSION_INPUT_MANAGE,
	]);
	const options = { store, ports, authorization };

	const calendar = await createPayrollCalendar(
		{
			...baseContext(organizationId, actorUserId),
			code: `CAL-${suffix}`,
			name: "Primary calendar",
			timezone: "UTC",
			effectiveFrom: "2025-01-01",
			idempotencyKey: `idem-cal-${suffix}`,
		},
		options,
	);
	if (!calendar.ok) {
		throw new Error(calendar.message);
	}

	const payGroup = await createPayrollPayGroup(
		{
			...baseContext(organizationId, actorUserId),
			calendarId: calendar.data.id,
			code: `PG-${suffix}`,
			name: "Primary pay group",
			currencyCode: "USD",
			idempotencyKey: `idem-pg-${suffix}`,
		},
		options,
	);
	if (!payGroup.ok) {
		throw new Error(payGroup.message);
	}

	const period = await createPayrollPeriod(
		{
			...baseContext(organizationId, actorUserId),
			payGroupId: payGroup.data.id,
			periodStart: "2025-01-01",
			periodEnd: "2025-01-31",
			cutoffDate: "2025-01-28",
			idempotencyKey: `idem-period-${suffix}`,
		},
		options,
	);
	if (!period.ok) {
		throw new Error(period.message);
	}

	const earningRule = await createPayrollEarningRule(
		{
			...baseContext(organizationId, actorUserId),
			payGroupId: payGroup.data.id,
			code: "BONUS",
			name: "Variable bonus",
			ruleType: "fixed",
			amount: "100.00",
			rate: null,
			currencyCode: "USD",
			ruleVersion: "v1",
			effectiveFrom: "2025-01-01",
			idempotencyKey: `idem-er-${suffix}`,
		},
		options,
	);
	if (!earningRule.ok) {
		throw new Error(earningRule.message);
	}

	return {
		store,
		ports,
		authorization,
		options,
		calendar: calendar.data,
		payGroup: payGroup.data,
		period: period.data,
		earningRule: earningRule.data,
	};
}

describe("payroll assignment and input commands", () => {
	it("rejects excess monetary precision at the command boundary", async () => {
		const result = await createPayrollVariableInput(
			{
				...baseContext("org-precision", "user-precision"),
				employeeId: "emp-precision",
				payGroupId: "00000000-0000-4000-8000-000000000001",
				periodId: "00000000-0000-4000-8000-000000000002",
				earningRuleId: "00000000-0000-4000-8000-000000000003",
				amount: "1.1234567890123",
				currencyCode: "USD",
				sourceType: "synthetic",
				sourceId: "precision-1",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-precision",
			},
			{
				store: createMemoryPayrollStore(),
				ports: createMemoryMutationPorts(),
				authorization: createGrantingAuthorization([
					PAYROLL_PERMISSION_INPUT_MANAGE,
				]),
				employees: createMemoryPayrollEmployeeQueryPort([]),
			},
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
	});

	it("denies assignment without payroll.setup.manage", async () => {
		const result = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-a", "user-a"),
				employeeId: "emp-a",
				payGroupId: "00000000-0000-4000-8000-000000000001",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-deny-assignment",
			},
			{
				store: createMemoryPayrollStore(),
				ports: createMemoryMutationPorts(),
				authorization: createDenyingAuthorization(),
				employees: createMemoryPayrollEmployeeQueryPort([]),
			},
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("expected forbidden");
		}
		expect(result.code).toBe("FORBIDDEN");
	});

	it("rejects terminated employee for assignment", async () => {
		const seeded = await seedSetupChain("org-term", "user-term", "term");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-term",
				employeeId: "emp-term",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "terminated",
				baseCompensation: "5000.00",
			},
		]);

		const result = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-term", "user-term"),
				employeeId: "emp-term",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-term-assignment",
			},
			{ ...seeded.options, employees },
		);
		expect(result.ok).toBe(false);
	});

	it("rejects wrong pay group for assignment", async () => {
		const seeded = await seedSetupChain("org-wpg", "user-wpg", "wpg");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-wpg",
				employeeId: "emp-wpg",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);

		const result = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-wpg", "user-wpg"),
				employeeId: "emp-wpg",
				payGroupId: "00000000-0000-4000-8000-000000000099",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-wpg-assignment",
			},
			{ ...seeded.options, employees },
		);
		expect(result.ok).toBe(false);
	});

	it("rejects currency mismatch for variable input", async () => {
		const seeded = await seedSetupChain("org-ccy", "user-ccy", "ccy");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-ccy",
				employeeId: "emp-ccy",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);

		const assignment = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-ccy", "user-ccy"),
				employeeId: "emp-ccy",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-ccy-assignment",
			},
			{ ...seeded.options, employees },
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			throw new Error(assignment.message);
		}

		const result = await createPayrollVariableInput(
			{
				...baseContext("org-ccy", "user-ccy"),
				employeeId: "emp-ccy",
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				earningRuleId: seeded.earningRule.id,
				amount: "250.00",
				currencyCode: "EUR",
				sourceType: "timesheet",
				sourceId: "ts-ccy-1",
				effectiveFrom: "2025-01-15",
				idempotencyKey: "idem-ccy-input",
			},
			{ ...seeded.options, employees },
		);
		expect(result.ok).toBe(false);
	});

	it("rejects cutoff violation for variable input", async () => {
		const seeded = await seedSetupChain("org-cut", "user-cut", "cut");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-cut",
				employeeId: "emp-cut",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);

		const result = await createPayrollVariableInput(
			{
				...baseContext("org-cut", "user-cut"),
				employeeId: "emp-cut",
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				earningRuleId: seeded.earningRule.id,
				amount: "250.00",
				currencyCode: "USD",
				sourceType: "timesheet",
				sourceId: "ts-cut-1",
				effectiveFrom: "2025-01-29",
				idempotencyKey: "idem-cut-input",
			},
			{ ...seeded.options, employees },
		);
		expect(result.ok).toBe(false);
	});

	it("rejects variable input outside its payroll period", async () => {
		const seeded = await seedSetupChain("org-period", "user-period", "period");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-period",
				employeeId: "emp-period",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);
		const options = { ...seeded.options, employees };
		const assignment = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-period", "user-period"),
				employeeId: "emp-period",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2024-12-01",
				idempotencyKey: "idem-period-assignment",
			},
			options,
		);
		expect(assignment.ok).toBe(true);

		const result = await createPayrollVariableInput(
			{
				...baseContext("org-period", "user-period"),
				employeeId: "emp-period",
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				earningRuleId: seeded.earningRule.id,
				amount: "250.00",
				currencyCode: "USD",
				sourceType: "timesheet",
				sourceId: "ts-period-1",
				effectiveFrom: "2024-12-31",
				idempotencyKey: "idem-period-input",
			},
			options,
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("expected period boundary rejection");
		}
		expect(result.code).toBe("CONFLICT");
	});

	it("rejects overlapping active assignments for one employee", async () => {
		const seeded = await seedSetupChain(
			"org-overlap",
			"user-overlap",
			"overlap",
		);
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-overlap",
				employeeId: "emp-overlap",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);
		const options = { ...seeded.options, employees };

		const first = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-overlap", "user-overlap"),
				employeeId: "emp-overlap",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-01-31",
				idempotencyKey: "idem-overlap-assignment-1",
			},
			options,
		);
		expect(first.ok).toBe(true);

		const overlapping = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-overlap", "user-overlap"),
				employeeId: "emp-overlap",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-15",
				idempotencyKey: "idem-overlap-assignment-2",
			},
			options,
		);
		expect(overlapping.ok).toBe(false);
		if (overlapping.ok) {
			throw new Error("expected overlapping assignment rejection");
		}
		expect(overlapping.code).toBe("CONFLICT");
	});

	it("keeps recurring items within their assignment effective range", async () => {
		const seeded = await seedSetupChain("org-range", "user-range", "range");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-range",
				employeeId: "emp-range",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);
		const options = { ...seeded.options, employees };
		const assignment = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-range", "user-range"),
				employeeId: "emp-range",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-01-20",
				idempotencyKey: "idem-range-assignment",
			},
			options,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			throw new Error(assignment.message);
		}

		const recurring = await createPayrollRecurringEarning(
			{
				...baseContext("org-range", "user-range"),
				employeeId: "emp-range",
				assignmentId: assignment.data.id,
				earningRuleId: seeded.earningRule.id,
				amount: "100.00",
				currencyCode: "USD",
				effectiveFrom: "2025-01-10",
				effectiveTo: "2025-01-31",
				idempotencyKey: "idem-range-recurring",
			},
			options,
		);
		expect(recurring.ok).toBe(false);
	});

	it("keeps variable inputs within their earning rule effective range", async () => {
		const seeded = await seedSetupChain(
			"org-input-rule-range",
			"user-input-rule-range",
			"input-rule-range",
		);
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-input-rule-range",
				employeeId: "emp-input-rule-range",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);
		const options = { ...seeded.options, employees };
		const assignment = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-input-rule-range", "user-input-rule-range"),
				employeeId: "emp-input-rule-range",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-input-rule-range-assignment",
			},
			options,
		);
		expect(assignment.ok).toBe(true);

		const boundedRule = await createPayrollEarningRule(
			{
				...baseContext("org-input-rule-range", "user-input-rule-range"),
				payGroupId: seeded.payGroup.id,
				code: "BOUNDED",
				name: "Bounded variable earning",
				ruleType: "fixed",
				amount: "100.00",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "v1",
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-01-15",
				idempotencyKey: "idem-input-rule-range-rule",
			},
			options,
		);
		expect(boundedRule.ok).toBe(true);
		if (!boundedRule.ok) {
			throw new Error(boundedRule.message);
		}

		const result = await createPayrollVariableInput(
			{
				...baseContext("org-input-rule-range", "user-input-rule-range"),
				employeeId: "emp-input-rule-range",
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				earningRuleId: boundedRule.data.id,
				amount: "250.00",
				currencyCode: "USD",
				sourceType: "timesheet",
				sourceId: "ts-input-rule-range-1",
				effectiveFrom: "2025-01-10",
				effectiveTo: "2025-01-20",
				idempotencyKey: "idem-input-rule-range-input",
			},
			options,
		);
		expect(result.ok).toBe(false);
	});

	it("returns same variable input for duplicate source idempotency", async () => {
		const seeded = await seedSetupChain("org-dup", "user-dup", "dup");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-dup",
				employeeId: "emp-dup",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);
		const options = { ...seeded.options, employees };
		const assignment = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-dup", "user-dup"),
				employeeId: "emp-dup",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-dup-assignment",
			},
			options,
		);
		expect(assignment.ok).toBe(true);

		const payload = {
			...baseContext("org-dup", "user-dup"),
			employeeId: "emp-dup",
			payGroupId: seeded.payGroup.id,
			periodId: seeded.period.id,
			earningRuleId: seeded.earningRule.id,
			amount: "250.00",
			currencyCode: "USD",
			sourceType: "timesheet",
			sourceId: "ts-dup-1",
			effectiveFrom: "2025-01-15",
		};

		const first = await createPayrollVariableInput(
			{ ...payload, idempotencyKey: "idem-dup-1" },
			options,
		);
		const second = await createPayrollVariableInput(
			{ ...payload, idempotencyKey: "idem-dup-2" },
			options,
		);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!(first.ok && second.ok)) {
			throw new Error("expected duplicate source replay");
		}
		expect(second.data.id).toBe(first.data.id);
	});

	it("conflicts on duplicate source with mismatched payload", async () => {
		const seeded = await seedSetupChain("org-mis", "user-mis", "mis");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-mis",
				employeeId: "emp-mis",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);
		const options = { ...seeded.options, employees };
		const assignment = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-mis", "user-mis"),
				employeeId: "emp-mis",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-mis-assignment",
			},
			options,
		);
		expect(assignment.ok).toBe(true);

		const first = await createPayrollVariableInput(
			{
				...baseContext("org-mis", "user-mis"),
				employeeId: "emp-mis",
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				earningRuleId: seeded.earningRule.id,
				amount: "250.00",
				currencyCode: "USD",
				sourceType: "timesheet",
				sourceId: "ts-mis-1",
				effectiveFrom: "2025-01-15",
				idempotencyKey: "idem-mis-1",
			},
			options,
		);
		expect(first.ok).toBe(true);

		const conflict = await createPayrollVariableInput(
			{
				...baseContext("org-mis", "user-mis"),
				employeeId: "emp-mis",
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				earningRuleId: seeded.earningRule.id,
				amount: "999.00",
				currencyCode: "USD",
				sourceType: "timesheet",
				sourceId: "ts-mis-1",
				effectiveFrom: "2025-01-15",
				idempotencyKey: "idem-mis-2",
			},
			options,
		);
		expect(conflict.ok).toBe(false);
	});

	it("isolates assignments by organization", async () => {
		const seededA = await seedSetupChain("org-a-iso", "user-a", "iso-a");
		const seededB = await seedSetupChain("org-b-iso", "user-b", "iso-b");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-a-iso",
				employeeId: "emp-iso",
				payGroupId: seededA.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);

		const assignment = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-a-iso", "user-a"),
				employeeId: "emp-iso",
				payGroupId: seededA.payGroup.id,
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-iso-assignment",
			},
			{ ...seededA.options, employees },
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			throw new Error(assignment.message);
		}

		const crossOrg = await seededB.store.getEmployeeAssignment({
			organizationId: "org-b-iso",
			assignmentId: assignment.data.id,
		});
		expect(crossOrg.ok).toBe(true);
		if (!crossOrg.ok) {
			throw new Error(crossOrg.message);
		}
		expect(crossOrg.data).toBeNull();
	});

	it("happy path: assignment, recurring earning, variable input", async () => {
		const seeded = await seedSetupChain("org-happy", "user-happy", "happy");
		const employees = createMemoryPayrollEmployeeQueryPort([
			{
				organizationId: "org-happy",
				employeeId: "emp-happy",
				payGroupId: seeded.payGroup.id,
				currencyCode: "USD",
				employmentStatus: "active",
				baseCompensation: "5000.00",
			},
		]);
		const options = { ...seeded.options, employees };

		const assignment = await createPayrollEmployeeAssignment(
			{
				...baseContext("org-happy", "user-happy"),
				employeeId: "emp-happy",
				payGroupId: seeded.payGroup.id,
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-happy-assignment",
			},
			options,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			throw new Error(assignment.message);
		}

		const recurring = await createPayrollRecurringEarning(
			{
				...baseContext("org-happy", "user-happy"),
				employeeId: "emp-happy",
				assignmentId: assignment.data.id,
				earningRuleId: seeded.earningRule.id,
				amount: "100.00",
				currencyCode: "USD",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-happy-recurring",
			},
			options,
		);
		expect(recurring.ok).toBe(true);

		const deductionRule = await createPayrollDeductionRule(
			{
				...baseContext("org-happy", "user-happy"),
				payGroupId: seeded.payGroup.id,
				code: "401K",
				name: "401K deduction",
				ruleType: "fixed",
				amount: "50.00",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "v1",
				taxTiming: "post_tax",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-happy-deduction-rule",
			},
			options,
		);
		expect(deductionRule.ok).toBe(true);
		if (!deductionRule.ok) {
			throw new Error(deductionRule.message);
		}

		const recurringDeduction = await createPayrollRecurringDeduction(
			{
				...baseContext("org-happy", "user-happy"),
				employeeId: "emp-happy",
				assignmentId: assignment.data.id,
				deductionRuleId: deductionRule.data.id,
				amount: "50.00",
				currencyCode: "USD",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-happy-recurring-deduction",
			},
			options,
		);
		expect(recurringDeduction.ok).toBe(true);

		const variable = await createPayrollVariableInput(
			{
				...baseContext("org-happy", "user-happy"),
				employeeId: "emp-happy",
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				earningRuleId: seeded.earningRule.id,
				amount: "250.00",
				currencyCode: "USD",
				sourceType: "timesheet",
				sourceId: "ts-happy-1",
				effectiveFrom: "2025-01-15",
				idempotencyKey: "idem-happy-input",
			},
			options,
		);
		expect(variable.ok).toBe(true);
	});
});
