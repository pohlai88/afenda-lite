import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors";
import type { PayrollEventType } from "@afenda/events";
import type { ApprovedPayrollHandoffParsed } from "../../features/workforce-ingress/parse-approved-payroll-handoff";
import type {
	PayrollExceptionSeverity,
	PayrollRunType,
} from "../contracts/projected-types";
import type {
	PayrollPayGroupId,
	PayrollPeriodId,
	PayrollRunId,
} from "../identity/brands";

export interface PayrollRunCalculatorException {
	employeeRef: string | null;
	exceptionCode: string;
	message: string;
	severity: PayrollExceptionSeverity;
}

export interface PayrollRunCalculatorResult {
	calculationSnapshotHash: string;
	calculationVersion: string;
	exceptions: PayrollRunCalculatorException[];
	roundingPolicyJson: Record<string, unknown>;
}

export interface PayrollRunCalculatorInput {
	actorUserId: string;
	correlationId: string;
	employeeIds?: string[];
	organizationId: string;
	payGroupId: PayrollPayGroupId;
	periodId: PayrollPeriodId;
	runId: PayrollRunId;
	runType: PayrollRunType;
	sequence: number;
}

export interface PayrollRunCalculatorPort {
	calculate: (
		input: PayrollRunCalculatorInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollRunCalculatorResult>>;
}

/** Redacted, bounded operation telemetry. Amounts and employee data are forbidden. */
export interface PayrollObservabilityPort {
	record: (input: {
		operation: string;
		outcome: "ok" | "failure";
		errorCode?: string;
		durationMs: number;
		organizationToken: string;
		actorToken: string;
	}) => Promise<void> | void;
}

export interface PayrollEmployeeFacts {
	approvedHandoff: ApprovedPayrollHandoffParsed;
	baseCompensation: string;
	currencyCode: string;
	employeeId: string;
	employmentStatus: "active" | "notice" | "terminated";
	recurringAllowances: Array<{
		code: string;
		amount: string;
	}>;
	recurringDeductions: Array<{
		code: string;
		amount: string;
	}>;
}

/**
 * Stable workforce ingress. The composition root carries the producer payload
 * unchanged; Payroll owns validation, historical normalization, and meaning.
 */
export interface PayrollWorkforceInputPort {
	getApprovedPayrollHandoff: (input: {
		organizationId: string;
		employeeId: string;
		effectiveDate: string;
		periodStart?: string;
		periodEnd?: string;
		actorUserId: string;
		correlationId: string;
	}) => Promise<Result<unknown | null>>;
	/** Resolve the employee owned by an authenticated actor for self-service reads. */
	resolveActorEmployeeId?: (input: {
		organizationId: string;
		actorUserId: string;
	}) => Promise<Result<string | null>>;
}

export interface AuditFactInput {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	changes: Change[];
	correlationId: string;
	entity: string;
	entityId: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
}

export interface AuditFactPort {
	record: (input: AuditFactInput) => Promise<Result<{ id: string }>>;
}

export interface OutboxFactInput {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	payload: Record<string, unknown>;
	type: PayrollEventType;
}

export interface OutboxPort {
	append: (input: OutboxFactInput) => Promise<Result<{ id: string }>>;
}

/** Optional unit-of-work boundary used by deterministic/test adapters. */
export interface MutationFactTransactionPort {
	execute: <T>(work: () => Promise<Result<T>>) => Promise<Result<T>>;
}

export interface MutationPorts {
	audit: AuditFactPort;
	outbox: OutboxPort;
	transaction?: MutationFactTransactionPort;
}
