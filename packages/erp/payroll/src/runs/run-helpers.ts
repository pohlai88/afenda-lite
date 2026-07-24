import { fail, ok, type Result } from "@afenda/errors/result";

import type { PayrollRunId } from "../brands";
import {
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	PAYROLL_ERROR_VALIDATION,
	payrollErrorDetails,
} from "../error-codes";
import type { MutationPorts } from "../ports";
import type { PayrollStore } from "../store";
import type { PayrollException, PayrollRun, PayrollRunStatus } from "../types";
import { assertPayrollRunTransition } from "./transitions";

export async function loadPayrollRun(
	store: PayrollStore,
	input: { organizationId: string; runId: PayrollRunId },
): Promise<Result<PayrollRun>> {
	const loaded = await store.getRun(input);
	if (!loaded.ok) {
		return loaded;
	}
	if (loaded.data === null) {
		return fail(
			"NOT_FOUND",
			"Payroll run not found",
			payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
		);
	}
	return ok(loaded.data);
}

export async function persistPayrollRunExceptions(
	store: PayrollStore,
	ports: MutationPorts,
	input: {
		organizationId: string;
		runId: PayrollRunId;
		actorUserId: string;
		correlationId: string;
		exceptions: Array<{
			severity: "blocking" | "warning";
			exceptionCode: string;
			message: string;
			employeeRef: string | null;
		}>;
	},
): Promise<Result<PayrollException[]>> {
	const created: PayrollException[] = [];
	for (const exception of input.exceptions) {
		const result = await store.createException(
			{
				organizationId: input.organizationId,
				runId: input.runId,
				severity: exception.severity,
				exceptionCode: exception.exceptionCode,
				message: exception.message,
				employeeRef: exception.employeeRef,
				createdBy: input.actorUserId,
				correlationId: input.correlationId,
			},
			ports,
		);
		if (!result.ok) {
			return result;
		}
		created.push(result.data);
	}
	return ok(created);
}

export async function transitionPayrollRun(
	store: PayrollStore,
	ports: MutationPorts,
	input: {
		run: PayrollRun;
		toStatus: PayrollRunStatus;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		calculationSnapshotHash?: string | null;
		calculationVersion?: string | null;
		roundingPolicyJson?: Record<string, unknown> | null;
		finalizedAt?: string | null;
		finalizedBy?: string | null;
	},
): Promise<Result<PayrollRun>> {
	if (input.run.status !== input.toStatus) {
		const allowed = assertPayrollRunTransition(
			input.run.status,
			input.toStatus,
		);
		if (!allowed.ok) {
			return allowed;
		}
	}

	return store.updateRunWithVersion(
		{
			organizationId: input.run.organizationId,
			runId: input.run.id,
			status: input.toStatus,
			calculationSnapshotHash: input.calculationSnapshotHash,
			calculationVersion: input.calculationVersion,
			roundingPolicyJson: input.roundingPolicyJson,
			finalizedAt: input.finalizedAt,
			finalizedBy: input.finalizedBy,
			expectedVersion: input.expectedVersion,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
		},
		ports,
	);
}

export function hasBlockingPayrollExceptions(
	exceptions: PayrollException[],
): boolean {
	return exceptions.some((exception) => exception.severity === "blocking");
}

export function requirePayrollRunCalculator(
	calculator: unknown,
): Result<NonNullable<import("../ports").PayrollRunCalculatorPort>> {
	if (
		calculator === undefined ||
		calculator === null ||
		typeof calculator !== "object" ||
		typeof (calculator as { calculate?: unknown }).calculate !== "function"
	) {
		return fail(
			"VALIDATION_ERROR",
			"Payroll run calculator port is required",
			payrollErrorDetails(PAYROLL_ERROR_VALIDATION),
		);
	}
	return ok(calculator as import("../ports").PayrollRunCalculatorPort);
}
