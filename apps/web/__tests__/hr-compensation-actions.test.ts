/**
 * HR Compensation Server Actions — permission deny, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-comp-operator",
	orgId: "org-hr-comp-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrCompMocks = vi.hoisted(() => ({
	createCompensationGrade: vi.fn(),
	updateCompensationGrade: vi.fn(),
	archiveCompensationGrade: vi.fn(),
	getCompensationGrade: vi.fn(),
	listCompensationGrades: vi.fn(),
	createSalaryBand: vi.fn(),
	supersedeSalaryBand: vi.fn(),
	archiveSalaryBand: vi.fn(),
	getSalaryBand: vi.fn(),
	listSalaryBandsByGrade: vi.fn(),
	findSalaryBandByGradeAndCurrencyAsOf: vi.fn(),
	createCompensationGradeProgressionRule: vi.fn(),
	archiveCompensationGradeProgressionRule: vi.fn(),
	getCompensationGradeProgressionRule: vi.fn(),
	listCompensationGradeProgressionRulesFromGrade: vi.fn(),
	listEligibleProgressionTargets: vi.fn(),
	createEmployeeCompensation: vi.fn(),
	amendEmployeeCompensation: vi.fn(),
	approveEmployeeCompensation: vi.fn(),
	scheduleEmployeeCompensationChange: vi.fn(),
	activateEmployeeCompensation: vi.fn(),
	correctEmployeeCompensation: vi.fn(),
	endEmployeeCompensation: vi.fn(),
	getEmployeeCompensation: vi.fn(),
	listEmployeeCompensationsByEmployee: vi.fn(),
	createCompensationProposal: vi.fn(),
	amendCompensationProposal: vi.fn(),
	approveCompensationProposal: vi.fn(),
	getCompensationProposal: vi.fn(),
	listCompensationProposals: vi.fn(),
	getApprovedCompensationHandoff: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-comp-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrCompMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	activateEmployeeCompensationAction,
	amendCompensationProposalAction,
	amendEmployeeCompensationAction,
	approveCompensationProposalAction,
	approveEmployeeCompensationAction,
	archiveCompensationGradeAction,
	archiveCompensationGradeProgressionRuleAction,
	archiveSalaryBandAction,
	correctEmployeeCompensationAction,
	createCompensationGradeAction,
	createCompensationGradeProgressionRuleAction,
	createCompensationProposalAction,
	createEmployeeCompensationAction,
	createSalaryBandAction,
	endEmployeeCompensationAction,
	findSalaryBandByGradeAndCurrencyAsOfAction,
	getApprovedCompensationHandoffAction,
	getCompensationGradeAction,
	getCompensationGradeProgressionRuleAction,
	getCompensationProposalAction,
	getEmployeeCompensationAction,
	getSalaryBandAction,
	listCompensationGradeProgressionRulesFromGradeAction,
	listCompensationGradesAction,
	listCompensationProposalsAction,
	listEligibleProgressionTargetsAction,
	listEmployeeCompensationsByEmployeeAction,
	listSalaryBandsByGradeAction,
	scheduleEmployeeCompensationChangeAction,
	supersedeSalaryBandAction,
	updateCompensationGradeAction,
} from "../app/actions/hr-compensation";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";
const compensationId = "33333333-3333-4333-8333-333333333333";
const proposalId = "44444444-4444-4444-8444-444444444444";
const applicationId = "55555555-5555-4555-8555-555555555555";
const gradeId = "66666666-6666-4666-8666-666666666666";
const salaryBandId = "77777777-7777-4777-8777-777777777777";
const progressionRuleId = "88888888-8888-4888-8888-888888888888";

describe("HR Compensation Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrCompMocks.createEmployeeCompensation.mockResolvedValue({
			ok: true,
			data: { id: compensationId, status: "draft" },
		});
		hrCompMocks.getApprovedCompensationHandoff.mockResolvedValue({
			ok: true,
			data: { employeeId, activeCompensation: null },
		});
	});

	it("denies compensation Actions before package invocation", async () => {
		const cases = [
			{
				invoke: () =>
					createCompensationGradeAction({ code: "G1", name: "Grade 1" }),
				mock: hrCompMocks.createCompensationGrade,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					updateCompensationGradeAction({
						gradeId,
						name: "Grade 1",
						expectedVersion: 1,
					}),
				mock: hrCompMocks.updateCompensationGrade,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					archiveCompensationGradeAction({ gradeId, expectedVersion: 1 }),
				mock: hrCompMocks.archiveCompensationGrade,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () => getCompensationGradeAction({ gradeId }),
				mock: hrCompMocks.getCompensationGrade,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () => listCompensationGradesAction({}),
				mock: hrCompMocks.listCompensationGrades,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () =>
					createSalaryBandAction({
						gradeId,
						currencyCode: "USD",
						minAmount: "40000.0000",
						midAmount: "50000.0000",
						maxAmount: "60000.0000",
						effectiveFrom: "2026-01-01",
					}),
				mock: hrCompMocks.createSalaryBand,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					supersedeSalaryBandAction({
						gradeId,
						currencyCode: "USD",
						minAmount: "45000.0000",
						midAmount: "55000.0000",
						maxAmount: "65000.0000",
						effectiveFrom: "2026-07-01",
					}),
				mock: hrCompMocks.supersedeSalaryBand,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					archiveSalaryBandAction({ salaryBandId, expectedVersion: 1 }),
				mock: hrCompMocks.archiveSalaryBand,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () => getSalaryBandAction({ salaryBandId }),
				mock: hrCompMocks.getSalaryBand,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () => listSalaryBandsByGradeAction({ gradeId }),
				mock: hrCompMocks.listSalaryBandsByGrade,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () =>
					findSalaryBandByGradeAndCurrencyAsOfAction({
						gradeId,
						currencyCode: "USD",
						asOf: "2026-01-01",
					}),
				mock: hrCompMocks.findSalaryBandByGradeAndCurrencyAsOf,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () =>
					createCompensationGradeProgressionRuleAction({
						fromGradeId: gradeId,
						toGradeId: salaryBandId,
						effectiveFrom: "2026-01-01",
					}),
				mock: hrCompMocks.createCompensationGradeProgressionRule,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					archiveCompensationGradeProgressionRuleAction({
						progressionRuleId,
						expectedVersion: 1,
					}),
				mock: hrCompMocks.archiveCompensationGradeProgressionRule,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					getCompensationGradeProgressionRuleAction({ progressionRuleId }),
				mock: hrCompMocks.getCompensationGradeProgressionRule,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () =>
					listCompensationGradeProgressionRulesFromGradeAction({ gradeId }),
				mock: hrCompMocks.listCompensationGradeProgressionRulesFromGrade,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () =>
					listEligibleProgressionTargetsAction({
						fromGradeId: gradeId,
						asOf: "2026-01-01",
					}),
				mock: hrCompMocks.listEligibleProgressionTargets,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () =>
					createEmployeeCompensationAction({
						idempotencyKey: "idem-denied",
						employeeId,
						employmentId,
						baseAmount: "50000.0000",
						currencyCode: "USD",
						payFrequency: "monthly",
						effectiveFrom: "2026-01-01",
						reason: "New hire",
					}),
				mock: hrCompMocks.createEmployeeCompensation,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					amendEmployeeCompensationAction({
						compensationId,
						baseAmount: "52000.0000",
						expectedVersion: 1,
					}),
				mock: hrCompMocks.amendEmployeeCompensation,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					approveEmployeeCompensationAction({
						compensationId,
						expectedVersion: 1,
					}),
				mock: hrCompMocks.approveEmployeeCompensation,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					scheduleEmployeeCompensationChangeAction({
						idempotencyKey: "idem-schedule",
						compensationId,
						baseAmount: "55000.0000",
						currencyCode: "USD",
						payFrequency: "monthly",
						effectiveFrom: "2026-07-01",
						reason: "Merit increase",
					}),
				mock: hrCompMocks.scheduleEmployeeCompensationChange,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					activateEmployeeCompensationAction({
						compensationId,
						expectedVersion: 1,
					}),
				mock: hrCompMocks.activateEmployeeCompensation,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					correctEmployeeCompensationAction({
						idempotencyKey: "idem-correct",
						compensationId,
						baseAmount: "51000.0000",
						currencyCode: "USD",
						payFrequency: "monthly",
						effectiveFrom: "2026-01-01",
						reason: "Data correction",
					}),
				mock: hrCompMocks.correctEmployeeCompensation,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					endEmployeeCompensationAction({
						compensationId,
						endsOn: "2026-12-31",
						expectedVersion: 1,
					}),
				mock: hrCompMocks.endEmployeeCompensation,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () => getEmployeeCompensationAction({ compensationId }),
				mock: hrCompMocks.getEmployeeCompensation,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () => listEmployeeCompensationsByEmployeeAction({ employeeId }),
				mock: hrCompMocks.listEmployeeCompensationsByEmployee,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () => createCompensationProposalAction({ applicationId }),
				mock: hrCompMocks.createCompensationProposal,
				permission: "human-resources.compensation-proposal.create",
			},
			{
				invoke: () =>
					amendCompensationProposalAction({
						proposalId,
						proposedBaseAmount: "60000.0000",
						expectedVersion: 1,
					}),
				mock: hrCompMocks.amendCompensationProposal,
				permission: "human-resources.compensation-proposal.amend",
			},
			{
				invoke: () =>
					approveCompensationProposalAction({
						proposalId,
						expectedVersion: 1,
					}),
				mock: hrCompMocks.approveCompensationProposal,
				permission: "human-resources.compensation-proposal.approve",
			},
			{
				invoke: () => getCompensationProposalAction({ proposalId }),
				mock: hrCompMocks.getCompensationProposal,
				permission: "human-resources.compensation-proposal.read",
			},
			{
				invoke: () => listCompensationProposalsAction({}),
				mock: hrCompMocks.listCompensationProposals,
				permission: "human-resources.compensation-proposal.read",
			},
			{
				invoke: () => getApprovedCompensationHandoffAction({ employeeId }),
				mock: hrCompMocks.getApprovedCompensationHandoff,
				permission: "human-resources.compensation.read",
			},
		];

		for (const testCase of cases) {
			vi.clearAllMocks();
			authMocks.requireRole.mockResolvedValue(operatorSession);
			permissionMocks.forbidUnlessPermission.mockResolvedValue({
				ok: false,
				code: "FORBIDDEN",
				message: "Compensation is not permitted.",
			});

			const result = await testCase.invoke();
			expect(result).toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Compensation is not permitted.",
			});
			expect(testCase.mock).not.toHaveBeenCalled();
			expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
				operatorSession,
				testCase.permission,
			);
		}
	});

	it("stamps org and actor on createEmployeeCompensationAction", async () => {
		const result = await createEmployeeCompensationAction({
			idempotencyKey: "idem-create-1",
			employeeId,
			employmentId,
			baseAmount: "50000.0000",
			currencyCode: "USD",
			payFrequency: "monthly",
			effectiveFrom: "2026-01-01",
			reason: "New hire",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.compensation.manage",
		);
		expect(hrCompMocks.createEmployeeCompensation).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-comp-test",
				employeeId,
				employmentId,
				reason: "New hire",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
// biome-ignore-all lint/performance/noAwaitInLoops: Cases run serially to isolate mutable test state and ordered transitions.
