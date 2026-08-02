import { errorResult, type Result } from "@afenda/errors";
import type {
	PayrollException,
	PayrollFinalizationProjection,
	PayrollReversalProjection,
	PayrollRun,
	PayrollRunStatus,
	PayrollRunUpdateInput,
} from "../../kernel/contracts/projected-types";
import type { MutationPorts } from "../../kernel/execution/ports";
import type { PayrollRunId } from "../../kernel/identity/brands";
import type { PayrollRunsStore } from "./runs.store";
import { assertPayrollRunTransition } from "./transitions";

export async function loadPayrollRun(
	store: PayrollRunsStore,
	input: { organizationId: string; runId: PayrollRunId },
): Promise<Result<PayrollRun>> {
	const loaded = await store.getRun(input);
	if (!loaded.ok) {
		return loaded;
	}
	if (loaded.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payroll run not found",
		});
	}
	return errorResult.ok(loaded.data);
}

export async function persistPayrollRunExceptions(
	store: PayrollRunsStore,
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
		// biome-ignore lint/performance/noAwaitInLoops: Exception evidence is persisted in deterministic order and fails fast on the first write error.
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
	return errorResult.ok(created);
}

export function transitionPayrollRun(
	store: PayrollRunsStore,
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
		auditReason?: string;
		reversalReasonCode?: PayrollRunUpdateInput["reversalReasonCode"];
		reversalIdempotencyKey?: string;
		reversalRequestFingerprint?: string;
		finalizationProjection?: PayrollFinalizationProjection;
		reversalProjection?: PayrollReversalProjection;
	},
): Promise<Result<PayrollRun>> {
	if (input.run.status !== input.toStatus) {
		const allowed = assertPayrollRunTransition(
			input.run.status,
			input.toStatus,
		);
		if (!allowed.ok) {
			return Promise.resolve(allowed);
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
			auditReason: input.auditReason,
			reversalReasonCode: input.reversalReasonCode,
			reversalIdempotencyKey: input.reversalIdempotencyKey,
			reversalRequestFingerprint: input.reversalRequestFingerprint,
			finalizationProjection: input.finalizationProjection,
			reversalProjection: input.reversalProjection,
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
): Result<
	NonNullable<import("../../kernel/execution/ports").PayrollRunCalculatorPort>
> {
	if (
		calculator === undefined ||
		calculator === null ||
		typeof calculator !== "object" ||
		typeof (calculator as { calculate?: unknown }).calculate !== "function"
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Payroll run calculator port is required",
		});
	}
	return errorResult.ok(
		calculator as import("../../kernel/execution/ports").PayrollRunCalculatorPort,
	);
}
