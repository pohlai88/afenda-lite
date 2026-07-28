import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type ApprovedPayrollHandoff,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";

import {
	createMemoryPayrollDeliveryStore,
	deliverPayrollHandoff,
	queuePayrollDelivery,
} from "../integrations/payroll-delivery";
import {
	checkpointConnectorCursor,
	claimDueReliabilityWork,
	createMemoryReliabilityStore,
	executeReliabilityWork,
	type ReliabilityExecutionOutcome,
	type ReliabilityKernelPorts,
	recoverConnectorCursor,
	registerReliabilityWork,
} from "../reliability";
import {
	applyEffectiveDatedCorrection,
	decideMigrationRecovery,
	decidePrivacyContainment,
	decideRollbackCompatibility,
} from "./decisions";
import type { LocalRecoveryDrill } from "./harness";

const ORGANIZATION_ID = "org-local-recovery";
const CORRELATION_ID = "corr-local-recovery";
const ACTOR_ID = "actor-local-recovery";

function payrollPayload(baseAmount = "85000.00"): ApprovedPayrollHandoff {
	return {
		contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-local",
		employmentId: "employment-local",
		assignment: {
			assignmentId: "assignment-local",
			positionId: "position-local",
		},
		effectiveDate: "2026-01-01",
		currencyCode: "USD",
		baseAmount,
		decimalScale: 2,
		roundingMode: "half_even",
		payFrequency: "monthly",
		components: [
			{
				code: "base",
				kind: "base",
				amount: baseAmount,
				currencyCode: "USD",
				decimalScale: 2,
				sourceType: "hr_employee_compensation",
				sourceId: "comp-local",
				sourceVersion: baseAmount === "85000.00" ? 1 : 2,
			},
		],
		leaveFacts: [],
		timeFacts: null,
		overtimeFacts: [],
		sourceVersion: {
			compensationVersion: baseAmount === "85000.00" ? 1 : 2,
		},
		approvalEvidence: {
			approvedAt: "2026-01-01T12:00:00.000Z",
			approvedBy: ACTOR_ID,
			correlationId: CORRELATION_ID,
		},
	};
}

function reliabilityPorts(
	outcomes: Result<ReliabilityExecutionOutcome>[],
): ReliabilityKernelPorts & { advance(milliseconds: number): void } {
	let now = new Date("2026-01-01T00:00:00.000Z");
	return {
		store: createMemoryReliabilityStore(),
		clock: { now: () => new Date(now) },
		executor: {
			async execute() {
				return (
					outcomes.shift() ??
					ok({ kind: "acknowledged", receiptId: "recovered" })
				);
			},
		},
		failureClassifier: {
			isRetryable: (failure) => failure.code === "INTERNAL_ERROR",
		},
		advance(milliseconds) {
			now = new Date(now.getTime() + milliseconds);
		},
	};
}

async function executeClaimedReliabilityWork(
	ports: ReliabilityKernelPorts,
	workItemId: string,
	policy: Parameters<typeof executeReliabilityWork>[0]["policy"],
) {
	const claimed = await claimDueReliabilityWork(
		{
			workerId: "recovery-drill",
			now: ports.clock.now(),
			leaseDurationMs: 120_000,
			limit: 1,
			perOrganizationLimit: 1,
		},
		ports.store,
	);
	if (!claimed.ok || claimed.data.length !== 1) {
		return fail("CONFLICT", "Recovery work was not due");
	}
	return executeReliabilityWork(
		{
			organizationId: ORGANIZATION_ID,
			workItemId,
			leaseOwner: "recovery-drill",
			policy,
		},
		ports,
	);
}

export function createHrLocalRecoveryDrills(): readonly LocalRecoveryDrill[] {
	return [
		{
			name: "migration_forward_repair",
			injectedFailure:
				"irreversible migration applied before deployment failure",
			expectedControl: "choose forward repair instead of destructive rollback",
			async execute() {
				const decision = decideMigrationRecovery({
					migrationApplied: true,
					migrationReversible: false,
					previousApplicationCompatible: false,
					dataWriteObserved: true,
				});
				return {
					passed: decision === "forward_repair",
					details: { decision },
				};
			},
		},
		{
			name: "stuck_outbox_dead_letter",
			injectedFailure:
				"retryable outbox transport fails through bounded attempt limit",
			expectedControl: "terminal dead letter is atomically recorded",
			async execute() {
				const ports = reliabilityPorts([
					fail("INTERNAL_ERROR", "injected transport failure"),
					fail("INTERNAL_ERROR", "injected transport failure"),
				]);
				const created = await registerReliabilityWork(
					{
						organizationId: ORGANIZATION_ID,
						connector: "platform",
						operation: "dispatch-events",
						targetType: "organization",
						targetId: ORGANIZATION_ID,
						correlationId: CORRELATION_ID,
						idempotencyKey: "idem-outbox-drill",
						requestFingerprint: "fingerprint-outbox-drill",
					},
					ports,
				);
				if (!created.ok) {
					return {
						passed: false,
						details: {
							stage: "register",
							attempts: 0,
							deadLetterRecorded: false,
						},
					};
				}
				const policy = {
					maxAttempts: 2,
					baseDelayMs: 10,
					maxDelayMs: 10,
					multiplier: 2,
				};
				await executeClaimedReliabilityWork(ports, created.data.id, policy);
				ports.advance(10);
				const terminal = await executeClaimedReliabilityWork(
					ports,
					created.data.id,
					policy,
				);
				const deadLetter = await ports.store.findDeadLetterByWorkItem({
					organizationId: ORGANIZATION_ID,
					workItemId: created.data.id,
				});
				return {
					passed:
						terminal.ok &&
						terminal.data.status === "dead_lettered" &&
						deadLetter.ok &&
						deadLetter.data !== null,
					details: {
						stage: null,
						attempts: terminal.ok ? terminal.data.attemptCount : 0,
						deadLetterRecorded: deadLetter.ok && deadLetter.data !== null,
					},
				};
			},
		},
		{
			name: "payroll_handoff_recovery",
			injectedFailure: "first payroll producer delivery attempt fails",
			expectedControl:
				"pending delivery replays and reaches delivered without duplication",
			async execute() {
				const store = createMemoryPayrollDeliveryStore();
				let attempts = 0;
				const ports = {
					store,
					clock: { now: () => new Date("2026-01-02T00:00:00.000Z") },
					producer: {
						async publish() {
							attempts += 1;
							return attempts === 1
								? fail("INTERNAL_ERROR", "injected producer outage")
								: ok({ receiptId: "receipt-recovered" });
						},
					},
				};
				const queued = await queuePayrollDelivery(
					{
						organizationId: ORGANIZATION_ID,
						correlationId: CORRELATION_ID,
						idempotencyKey: "idem-payroll-recovery",
						actorUserId: ACTOR_ID,
						payload: payrollPayload(),
						maxAttempts: 3,
					},
					ports,
				);
				if (!queued.ok) {
					return {
						passed: false,
						details: { stage: "queue", attempts: 0, status: "error" },
					};
				}
				const command = {
					organizationId: ORGANIZATION_ID,
					deliveryId: queued.data.id,
					correlationId: CORRELATION_ID,
					actorUserId: ACTOR_ID,
				};
				await deliverPayrollHandoff(command, ports);
				const recovered = await deliverPayrollHandoff(command, ports);
				return {
					passed:
						recovered.ok &&
						recovered.data.status === "delivered" &&
						recovered.data.attemptCount === 2,
					details: {
						stage: null,
						attempts,
						status: recovered.ok ? recovered.data.status : "error",
					},
				};
			},
		},
		{
			name: "attendance_cursor_recovery",
			injectedFailure:
				"stale worker attempts to overwrite committed attendance cursor",
			expectedControl:
				"cursor CAS rejects stale write and recovers last commit",
			async execute() {
				const ports = reliabilityPorts([]);
				await checkpointConnectorCursor(
					{
						organizationId: ORGANIZATION_ID,
						connector: "attendance",
						stream: "clock-events",
						cursor: "page-10",
						expectedVersion: null,
					},
					ports,
				);
				const stale = await checkpointConnectorCursor(
					{
						organizationId: ORGANIZATION_ID,
						connector: "attendance",
						stream: "clock-events",
						cursor: "page-11",
						expectedVersion: null,
					},
					ports,
				);
				const recovered = await recoverConnectorCursor(
					{
						organizationId: ORGANIZATION_ID,
						connector: "attendance",
						stream: "clock-events",
					},
					ports.store,
				);
				return {
					passed:
						!stale.ok &&
						stale.code === "CONFLICT" &&
						recovered.ok &&
						recovered.data?.cursor === "page-10",
					details: {
						staleRejected: !stale.ok,
						recoveredCursor: recovered.ok
							? (recovered.data?.cursor ?? null)
							: null,
					},
				};
			},
		},
		{
			name: "privacy_incident_containment",
			injectedFailure: "cross-tenant PII appears in integration telemetry",
			expectedControl:
				"contain, quarantine, revoke connector, preserve evidence",
			async execute() {
				const decision = decidePrivacyContainment({
					crossTenantExposure: true,
					piiInTelemetry: true,
					credentialExposure: false,
				});
				return {
					passed:
						decision.action === "contain" &&
						decision.quarantineQueue &&
						decision.revokeConnector &&
						decision.preserveAuditEvidence,
					details: decision,
				};
			},
		},
		{
			name: "effective_dated_correction",
			injectedFailure:
				"same-effective-date correction would create an inverted predecessor range",
			expectedControl:
				"supersede predecessor and clamp its end to a valid range",
			async execute() {
				const result = applyEffectiveDatedCorrection({
					current: {
						id: "version-1",
						effectiveFrom: "2026-02-01",
						effectiveTo: null,
						status: "active",
						value: "85000.00",
						supersedesId: null,
					},
					correctionId: "version-2",
					effectiveFrom: "2026-02-01",
					value: "86000.00",
				});
				return {
					passed:
						result.superseded.status === "superseded" &&
						result.superseded.effectiveTo === "2026-02-01" &&
						result.correction.supersedesId === "version-1",
					details: {
						predecessorEnd: result.superseded.effectiveTo,
						correctionStatus: result.correction.status,
					},
				};
			},
		},
		{
			name: "tenant_leakage_fail_closed",
			injectedFailure:
				"wrong tenant and correlation attempt payroll delivery replay",
			expectedControl: "return not found and never invoke producer",
			async execute() {
				const store = createMemoryPayrollDeliveryStore();
				let producerCalls = 0;
				const ports = {
					store,
					clock: { now: () => new Date("2026-01-02T00:00:00.000Z") },
					producer: {
						async publish() {
							producerCalls += 1;
							return ok({ receiptId: "unexpected" });
						},
					},
				};
				const queued = await queuePayrollDelivery(
					{
						organizationId: ORGANIZATION_ID,
						correlationId: CORRELATION_ID,
						idempotencyKey: "idem-tenant-leakage",
						actorUserId: ACTOR_ID,
						payload: payrollPayload(),
					},
					ports,
				);
				if (!queued.ok) {
					return {
						passed: false,
						details: {
							stage: "queue",
							producerCalls: 0,
							failClosed: false,
						},
					};
				}
				const leaked = await deliverPayrollHandoff(
					{
						organizationId: "org-attacker",
						deliveryId: queued.data.id,
						correlationId: "corr-attacker",
						actorUserId: "actor-attacker",
					},
					ports,
				);
				return {
					passed:
						!leaked.ok && leaked.code === "NOT_FOUND" && producerCalls === 0,
					details: { stage: null, producerCalls, failClosed: !leaked.ok },
				};
			},
		},
		{
			name: "rollback_compatibility",
			injectedFailure:
				"new write shape exists when previous application is considered",
			expectedControl: "block rollback and require forward repair",
			async execute() {
				const decision = decideRollbackCompatibility({
					previousReaderSupportsCurrentSchema: true,
					irreversibleMigrationApplied: false,
					newWriteShapeObserved: true,
				});
				return {
					passed: decision === "forward_repair_required",
					details: { decision },
				};
			},
		},
	];
}
