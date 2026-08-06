/**
 * Payroll jobs Server Actions — permission deny, validation, session stamp.
 * Operator surface only: enqueue, get, list dead letters, replay dead letter.
 * Cron-owned surfaces (claimDuePayrollJobWork, executePayrollJobWork) are not exposed here.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-jobs-operator",
	orgId: "org-payroll-jobs-active",
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
	enqueuePayrollCalculationJob: vi.fn(),
	getPayrollJob: vi.fn(),
	listPayrollDeadLetters: vi.fn(),
	replayPayrollDeadLetter: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-jobs-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		enqueuePayrollCalculationJob: payrollMocks.enqueuePayrollCalculationJob,
		getPayrollJob: payrollMocks.getPayrollJob,
		listPayrollDeadLetters: payrollMocks.listPayrollDeadLetters,
		replayPayrollDeadLetter: payrollMocks.replayPayrollDeadLetter,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	enqueuePayrollCalculationJobAction,
	getPayrollJobAction,
	listPayrollDeadLettersAction,
	replayPayrollDeadLetterAction,
} from "../app/actions/payroll-jobs";

const runId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const deadLetterId = "33333333-3333-4333-8333-333333333333";

describe("Payroll jobs Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		authMocks.getSession.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.enqueuePayrollCalculationJob.mockResolvedValue({
			ok: true,
			data: { jobId, status: "queued" },
		});
		payrollMocks.getPayrollJob.mockResolvedValue({
			ok: true,
			data: { id: jobId, status: "queued" },
		});
		payrollMocks.listPayrollDeadLetters.mockResolvedValue({
			ok: true,
			data: [{ id: deadLetterId }],
		});
		payrollMocks.replayPayrollDeadLetter.mockResolvedValue({
			ok: true,
			data: { jobId },
		});
	});

	it("denies enqueuePayrollCalculationJobAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await enqueuePayrollCalculationJobAction({
			idempotencyKey: "idem-job-1",
			runId,
		});

		expect(result.ok).toBe(false);
		expect(payrollMocks.enqueuePayrollCalculationJob).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.calculate",
		);
	});

	it("rejects invalid enqueuePayrollCalculationJobAction input before calling the domain", async () => {
		const result = await enqueuePayrollCalculationJobAction({
			idempotencyKey: "idem-job-1",
			runId: "not-a-uuid",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.enqueuePayrollCalculationJob).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation on enqueuePayrollCalculationJobAction", async () => {
		const result = await enqueuePayrollCalculationJobAction({
			idempotencyKey: "idem-job-1",
			runId,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.enqueuePayrollCalculationJob).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-jobs-test",
				idempotencyKey: "idem-job-1",
				runId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("denies getPayrollJobAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await getPayrollJobAction({ jobId });

		expect(result.ok).toBe(false);
		expect(payrollMocks.getPayrollJob).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.review",
		);
	});

	it("stamps session on getPayrollJobAction with payroll.run.review", async () => {
		const result = await getPayrollJobAction({ jobId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.getPayrollJob).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				jobId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("lists dead letters with payroll.run.review", async () => {
		const result = await listPayrollDeadLettersAction({ jobId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.listPayrollDeadLetters).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				jobId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.review",
		);
	});

	it("stamps session on replayPayrollDeadLetterAction with payroll.run.calculate", async () => {
		const result = await replayPayrollDeadLetterAction({
			deadLetterId,
			idempotencyKey: "idem-replay-1",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.replayPayrollDeadLetter).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-jobs-test",
				deadLetterId,
				idempotencyKey: "idem-replay-1",
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.calculate",
		);
	});

	it("denies replayPayrollDeadLetterAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await replayPayrollDeadLetterAction({
			deadLetterId,
			idempotencyKey: "idem-replay-1",
		});

		expect(result.ok).toBe(false);
		expect(payrollMocks.replayPayrollDeadLetter).not.toHaveBeenCalled();
	});

	it("rejects invalid replayPayrollDeadLetterAction input", async () => {
		const result = await replayPayrollDeadLetterAction({
			deadLetterId: "not-a-uuid",
			idempotencyKey: "idem-replay-1",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.replayPayrollDeadLetter).not.toHaveBeenCalled();
	});
});
