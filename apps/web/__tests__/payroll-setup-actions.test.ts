/**
 * Payroll setup Server Actions — permission deny, validation, session stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-setup-operator",
	orgId: "org-payroll-setup-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	getSession: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const payrollMocks = vi.hoisted(() => ({
	createPayrollCalendar: vi.fn(),
	updatePayrollCalendar: vi.fn(),
	archivePayrollCalendar: vi.fn(),
	getPayrollCalendar: vi.fn(),
	listPayrollCalendars: vi.fn(),
	createPayrollPayGroup: vi.fn(),
	updatePayrollPayGroup: vi.fn(),
	archivePayrollPayGroup: vi.fn(),
	getPayrollPayGroup: vi.fn(),
	listPayrollPayGroups: vi.fn(),
	createPayrollEarningRule: vi.fn(),
	updatePayrollEarningRule: vi.fn(),
	archivePayrollEarningRule: vi.fn(),
	supersedePayrollEarningRule: vi.fn(),
	getPayrollEarningRule: vi.fn(),
	createPayrollDeductionRule: vi.fn(),
	updatePayrollDeductionRule: vi.fn(),
	archivePayrollDeductionRule: vi.fn(),
	supersedePayrollDeductionRule: vi.fn(),
	getPayrollDeductionRule: vi.fn(),
	createPayrollStatutoryRule: vi.fn(),
	updatePayrollStatutoryRule: vi.fn(),
	archivePayrollStatutoryRule: vi.fn(),
	supersedePayrollStatutoryRule: vi.fn(),
	getPayrollStatutoryRule: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: {
		session: {
			requireRole: authMocks.requireRole,
			get: authMocks.getSession,
		},
	},
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-payroll-setup-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		createPayrollCalendar: payrollMocks.createPayrollCalendar,
		updatePayrollCalendar: payrollMocks.updatePayrollCalendar,
		archivePayrollCalendar: payrollMocks.archivePayrollCalendar,
		getPayrollCalendar: payrollMocks.getPayrollCalendar,
		listPayrollCalendars: payrollMocks.listPayrollCalendars,
		createPayrollPayGroup: payrollMocks.createPayrollPayGroup,
		updatePayrollPayGroup: payrollMocks.updatePayrollPayGroup,
		archivePayrollPayGroup: payrollMocks.archivePayrollPayGroup,
		getPayrollPayGroup: payrollMocks.getPayrollPayGroup,
		listPayrollPayGroups: payrollMocks.listPayrollPayGroups,
		createPayrollEarningRule: payrollMocks.createPayrollEarningRule,
		updatePayrollEarningRule: payrollMocks.updatePayrollEarningRule,
		archivePayrollEarningRule: payrollMocks.archivePayrollEarningRule,
		supersedePayrollEarningRule: payrollMocks.supersedePayrollEarningRule,
		getPayrollEarningRule: payrollMocks.getPayrollEarningRule,
		createPayrollDeductionRule: payrollMocks.createPayrollDeductionRule,
		updatePayrollDeductionRule: payrollMocks.updatePayrollDeductionRule,
		archivePayrollDeductionRule: payrollMocks.archivePayrollDeductionRule,
		supersedePayrollDeductionRule: payrollMocks.supersedePayrollDeductionRule,
		getPayrollDeductionRule: payrollMocks.getPayrollDeductionRule,
		createPayrollStatutoryRule: payrollMocks.createPayrollStatutoryRule,
		updatePayrollStatutoryRule: payrollMocks.updatePayrollStatutoryRule,
		archivePayrollStatutoryRule: payrollMocks.archivePayrollStatutoryRule,
		supersedePayrollStatutoryRule: payrollMocks.supersedePayrollStatutoryRule,
		getPayrollStatutoryRule: payrollMocks.getPayrollStatutoryRule,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	archivePayrollCalendarAction,
	archivePayrollDeductionRuleAction,
	archivePayrollEarningRuleAction,
	archivePayrollPayGroupAction,
	archivePayrollStatutoryRuleAction,
	createPayrollCalendarAction,
	createPayrollDeductionRuleAction,
	createPayrollEarningRuleAction,
	createPayrollPayGroupAction,
	createPayrollStatutoryRuleAction,
	getPayrollCalendarAction,
	getPayrollDeductionRuleAction,
	getPayrollEarningRuleAction,
	getPayrollPayGroupAction,
	getPayrollStatutoryRuleAction,
	listPayrollCalendarsAction,
	listPayrollPayGroupsAction,
	supersedePayrollDeductionRuleAction,
	supersedePayrollEarningRuleAction,
	supersedePayrollStatutoryRuleAction,
	updatePayrollCalendarAction,
	updatePayrollDeductionRuleAction,
	updatePayrollEarningRuleAction,
	updatePayrollPayGroupAction,
	updatePayrollStatutoryRuleAction,
} from "../app/actions/payroll-setup";

const calendarId = "11111111-1111-4111-8111-111111111111";
const payGroupId = "22222222-2222-4222-8222-222222222222";
const ruleId = "33333333-3333-4333-8333-333333333333";

const createCalendarInput = {
	code: "CAL-MY",
	effectiveFrom: "2026-01-01",
	idempotencyKey: "idem-cal-1",
	name: "Malaysia Calendar",
	timezone: "Asia/Kuala_Lumpur",
};

const createPayGroupInput = {
	calendarId,
	code: "PG-MY",
	currencyCode: "MYR",
	idempotencyKey: "idem-pg-1",
	name: "Malaysia Pay Group",
};

const createEarningRuleInput = {
	amount: "5000.00",
	code: "BASIC",
	currencyCode: "MYR",
	effectiveFrom: "2026-01-01",
	idempotencyKey: "idem-earn-1",
	name: "Basic Salary",
	payGroupId,
	rate: null,
	ruleType: "fixed" as const,
	ruleVersion: "v1",
};

const createDeductionRuleInput = {
	...createEarningRuleInput,
	code: "EPF-EE",
	idempotencyKey: "idem-deduct-1",
	name: "EPF Employee",
	taxTiming: "pre_tax" as const,
};

const createStatutoryRuleInput = {
	code: "EPF",
	effectiveFrom: "2026-01-01",
	idempotencyKey: "idem-stat-1",
	jurisdictionCode: "MY",
	name: "EPF Malaysia",
	payGroupId,
	ruleVersion: "v1",
};

describe("Payroll setup Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.createPayrollCalendar.mockResolvedValue({
			ok: true,
			data: { id: calendarId },
		});
		payrollMocks.updatePayrollCalendar.mockResolvedValue({
			ok: true,
			data: { id: calendarId },
		});
		payrollMocks.archivePayrollCalendar.mockResolvedValue({
			ok: true,
			data: { id: calendarId },
		});
		payrollMocks.getPayrollCalendar.mockResolvedValue({
			ok: true,
			data: { id: calendarId },
		});
		payrollMocks.listPayrollCalendars.mockResolvedValue({
			ok: true,
			data: [{ id: calendarId }],
		});
		payrollMocks.createPayrollPayGroup.mockResolvedValue({
			ok: true,
			data: { id: payGroupId },
		});
		payrollMocks.updatePayrollPayGroup.mockResolvedValue({
			ok: true,
			data: { id: payGroupId },
		});
		payrollMocks.archivePayrollPayGroup.mockResolvedValue({
			ok: true,
			data: { id: payGroupId },
		});
		payrollMocks.getPayrollPayGroup.mockResolvedValue({
			ok: true,
			data: { id: payGroupId },
		});
		payrollMocks.listPayrollPayGroups.mockResolvedValue({
			ok: true,
			data: [{ id: payGroupId }],
		});
		payrollMocks.createPayrollEarningRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.updatePayrollEarningRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.archivePayrollEarningRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.supersedePayrollEarningRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.getPayrollEarningRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.createPayrollDeductionRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.updatePayrollDeductionRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.archivePayrollDeductionRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.supersedePayrollDeductionRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.getPayrollDeductionRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.createPayrollStatutoryRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.updatePayrollStatutoryRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.archivePayrollStatutoryRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.supersedePayrollStatutoryRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
		payrollMocks.getPayrollStatutoryRule.mockResolvedValue({
			ok: true,
			data: { id: ruleId },
		});
	});

	it("denies createPayrollCalendarAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createPayrollCalendarAction(createCalendarInput);

		expect(result.ok).toBe(false);
		expect(payrollMocks.createPayrollCalendar).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.setup.manage",
		);
	});

	it("rejects invalid createPayrollCalendarAction input before calling the domain", async () => {
		const result = await createPayrollCalendarAction({
			...createCalendarInput,
			timezone: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.createPayrollCalendar).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation on createPayrollCalendarAction", async () => {
		const result = await createPayrollCalendarAction(createCalendarInput);

		expect(result).toEqual({ ok: true, data: { id: calendarId } });
		expect(payrollMocks.createPayrollCalendar).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				code: "CAL-MY",
				effectiveFrom: "2026-01-01",
				idempotencyKey: "idem-cal-1",
				name: "Malaysia Calendar",
				timezone: "Asia/Kuala_Lumpur",
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps session on createPayrollPayGroupAction", async () => {
		const result = await createPayrollPayGroupAction(createPayGroupInput);

		expect(result.ok).toBe(true);
		expect(payrollMocks.createPayrollPayGroup).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				calendarId,
				code: "PG-MY",
				currencyCode: "MYR",
				idempotencyKey: "idem-pg-1",
				name: "Malaysia Pay Group",
			},
			{ kind: "payroll-options" },
		);
	});

	it("denies createPayrollPayGroupAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createPayrollPayGroupAction(createPayGroupInput);

		expect(result.ok).toBe(false);
		expect(payrollMocks.createPayrollPayGroup).not.toHaveBeenCalled();
	});

	it("stamps session on createPayrollEarningRuleAction", async () => {
		const result = await createPayrollEarningRuleAction(createEarningRuleInput);

		expect(result.ok).toBe(true);
		expect(payrollMocks.createPayrollEarningRule).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				code: "BASIC",
				ruleType: "fixed",
			}),
			{ kind: "payroll-options" },
		);
	});

	it("rejects earning rule with missing required fields", async () => {
		const result = await createPayrollEarningRuleAction({
			...createEarningRuleInput,
			code: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.createPayrollEarningRule).not.toHaveBeenCalled();
	});

	it("stamps session on createPayrollDeductionRuleAction", async () => {
		const result = await createPayrollDeductionRuleAction(
			createDeductionRuleInput,
		);

		expect(result.ok).toBe(true);
		expect(payrollMocks.createPayrollDeductionRule).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				taxTiming: "pre_tax",
			}),
			{ kind: "payroll-options" },
		);
	});

	it("stamps session on createPayrollStatutoryRuleAction", async () => {
		const result = await createPayrollStatutoryRuleAction(
			createStatutoryRuleInput,
		);

		expect(result.ok).toBe(true);
		expect(payrollMocks.createPayrollStatutoryRule).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				jurisdictionCode: "MY",
			}),
			{ kind: "payroll-options" },
		);
	});

	it("archives calendar with session stamp", async () => {
		const result = await archivePayrollCalendarAction({
			calendarId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.archivePayrollCalendar).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				calendarId,
				expectedVersion: 1,
			},
			{ kind: "payroll-options" },
		);
	});

	it("archives pay group with session stamp", async () => {
		const result = await archivePayrollPayGroupAction({
			payGroupId,
			expectedVersion: 2,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.archivePayrollPayGroup).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				payGroupId,
				expectedVersion: 2,
			},
			{ kind: "payroll-options" },
		);
	});

	it("supersedes earning rule with session stamp", async () => {
		const result = await supersedePayrollEarningRuleAction({
			ruleId,
			effectiveFrom: "2026-06-01",
			expectedVersion: 1,
			idempotencyKey: "idem-sup-1",
			ruleVersion: "v2",
			amount: "5500.00",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.supersedePayrollEarningRule).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				ruleId,
				ruleVersion: "v2",
				amount: "5500.00",
			}),
			{ kind: "payroll-options" },
		);
	});

	it("supersedes deduction rule with session stamp", async () => {
		const result = await supersedePayrollDeductionRuleAction({
			ruleId,
			effectiveFrom: "2026-06-01",
			expectedVersion: 1,
			idempotencyKey: "idem-sup-deduct-1",
			ruleVersion: "v2",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.supersedePayrollDeductionRule).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				ruleId,
			}),
			{ kind: "payroll-options" },
		);
	});

	it("supersedes statutory rule with session stamp", async () => {
		const result = await supersedePayrollStatutoryRuleAction({
			ruleId,
			effectiveFrom: "2026-06-01",
			expectedVersion: 1,
			idempotencyKey: "idem-sup-stat-1",
			ruleVersion: "v2",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.supersedePayrollStatutoryRule).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				ruleId,
			}),
			{ kind: "payroll-options" },
		);
	});

	it("gets and lists calendars and pay groups with payroll.setup.manage", async () => {
		const calResult = await getPayrollCalendarAction({ calendarId });
		const listCalResult = await listPayrollCalendarsAction({
			status: "active",
		});
		const pgResult = await getPayrollPayGroupAction({ payGroupId });
		const listPgResult = await listPayrollPayGroupsAction({});

		expect(calResult.ok).toBe(true);
		expect(listCalResult.ok).toBe(true);
		expect(pgResult.ok).toBe(true);
		expect(listPgResult.ok).toBe(true);

		expect(payrollMocks.getPayrollCalendar).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-setup-test",
				calendarId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.setup.manage",
		);
	});

	it("gets rules with session stamp", async () => {
		const earnResult = await getPayrollEarningRuleAction({ ruleId });
		const deductResult = await getPayrollDeductionRuleAction({ ruleId });
		const statResult = await getPayrollStatutoryRuleAction({ ruleId });

		expect(earnResult.ok).toBe(true);
		expect(deductResult.ok).toBe(true);
		expect(statResult.ok).toBe(true);
	});

	it("archives earning, deduction, and statutory rules with session stamp", async () => {
		const earnResult = await archivePayrollEarningRuleAction({
			ruleId,
			expectedVersion: 1,
		});
		const deductResult = await archivePayrollDeductionRuleAction({
			ruleId,
			expectedVersion: 1,
		});
		const statResult = await archivePayrollStatutoryRuleAction({
			ruleId,
			expectedVersion: 1,
		});

		expect(earnResult.ok).toBe(true);
		expect(deductResult.ok).toBe(true);
		expect(statResult.ok).toBe(true);
	});

	it("updates calendar, pay group, and rules with session stamp", async () => {
		const calResult = await updatePayrollCalendarAction({
			calendarId,
			expectedVersion: 1,
			name: "Updated Calendar",
		});
		const pgResult = await updatePayrollPayGroupAction({
			payGroupId,
			expectedVersion: 1,
			name: "Updated Pay Group",
		});
		const earnResult = await updatePayrollEarningRuleAction({
			ruleId,
			expectedVersion: 1,
			name: "Updated Earning Rule",
		});
		const deductResult = await updatePayrollDeductionRuleAction({
			ruleId,
			expectedVersion: 1,
			name: "Updated Deduction Rule",
		});
		const statResult = await updatePayrollStatutoryRuleAction({
			ruleId,
			expectedVersion: 1,
			name: "Updated Statutory Rule",
		});

		expect(calResult.ok).toBe(true);
		expect(pgResult.ok).toBe(true);
		expect(earnResult.ok).toBe(true);
		expect(deductResult.ok).toBe(true);
		expect(statResult.ok).toBe(true);
	});
});
