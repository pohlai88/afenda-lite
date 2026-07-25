import {
	HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	adjustLeaveEntitlement,
	grantLeaveEntitlement,
} from "../src/leave/entitlement";
import {
	createLeavePolicy,
	publishLeavePolicy,
} from "../src/leave/leave-policy";
import {
	createDraftLeaveRequest,
	submitLeaveRequest,
} from "../src/leave/leave-request";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
} from "../src/module-ids";
import {
	emitHumanResourcesMutationOutcome,
	getHumanResourcesMutationEmission,
} from "../src/mutation-emission-registry";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { attachMutationExecutionContext } from "../src/shared/mutation-meta";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-no-double-emission";
const ACTOR = "user-no-double-emission";

const SEED_PERMISSIONS = HUMAN_RESOURCES_PERMISSION_CODES;

function readyHarness(ports: ReturnType<typeof createMemoryMutationPorts>) {
	const store = createMemoryHumanResourcesStore();
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization: createGrantingHumanResourcesAuthorization(SEED_PERMISSIONS),
		identityResolver: createStoreBackedIdentityResolver(store),
	});
}

async function seedEmployeeEmployment(ready: ReturnType<typeof readyHarness>) {
	const employee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-seed-emp",
			idempotencyKey: "idem-seed-emp",
			employeeNumber: `E-${randomSuffix()}`,
			legalName: "No Double Worker",
		},
		ready,
	);
	if (!employee.ok) return employee;

	const mapped = await mapActorToEmployee(ready.store, {
		organizationId: ORG,
		userId: ACTOR,
		employeeId: employee.data.id,
		actorUserId: ACTOR,
		effectiveFrom: "2026-01-01",
	});
	if (!mapped.ok) return mapped;

	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-seed-emp",
			employeeId: employee.data.id,
			startsOn: "2026-01-01",
		},
		ready,
	);
	if (!employment.ok) return employment;

	return {
		ok: true as const,
		employee: employee.data,
		employment: employment.data,
	};
}

function randomSuffix(): string {
	return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function seedActiveEntitlement(
	ready: ReturnType<typeof readyHarness>,
	label: string,
) {
	const seeded = await seedEmployeeEmployment(ready);
	if (!seeded.ok) return seeded;

	const policy = await createLeavePolicy(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-policy-${label}`,
			code: `ANNUAL-${label}`,
			name: `Annual Leave ${label}`,
			leaveType: "annual",
			unit: "days",
			paid: true,
			allowsNegativeBalance: false,
			allowSelfApproval: false,
			effectiveFrom: "2026-01-01",
			allowedEmploymentStatuses: ["active"],
		},
		ready,
	);
	if (!policy.ok) return policy;

	const published = await publishLeavePolicy(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-publish-${label}`,
			policyId: policy.data.id,
			expectedVersion: policy.data.version,
		},
		ready,
	);
	if (!published.ok) return published;

	const entitlement = await grantLeaveEntitlement(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-grant-${label}`,
			idempotencyKey: `idem-grant-${label}`,
			employeeId: seeded.employee.id,
			employmentId: seeded.employment.id,
			policyId: policy.data.id,
			periodStart: "2026-01-01",
			periodEnd: "2026-12-31",
			openingQuantity: "10",
		},
		ready,
	);
	if (!entitlement.ok) return entitlement;

	return {
		ok: true as const,
		employee: seeded.employee,
		employment: seeded.employment,
		policy: published.data,
		entitlement: entitlement.data,
	};
}

function baseMeta(operationId: string) {
	return attachMutationExecutionContext(
		{
			correlationId: "corr-no-double",
			operationId,
			idempotencyKey: "idem-no-double",
		},
		{
			organizationId: ORG,
			actorUserId: ACTOR,
		},
	);
}

describe("no double emission", () => {
	it("audit-only leave policy create emits one audit and zero outbox events", async () => {
		const ports = createMemoryMutationPorts();
		const definition = getHumanResourcesMutationEmission(
			HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
		);
		const result = await emitHumanResourcesMutationOutcome(
			{
				commandId: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
				meta: baseMeta(HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE),
				aggregateType: definition.aggregateType,
				aggregateId: "policy-1",
				audit: {
					entity: "hr_leave_policy",
					action: "CREATE",
					changes: [],
				},
			},
			ports,
		);
		expect(result.ok).toBe(true);
		expect(ports.audit.calls).toHaveLength(1);
		expect(ports.outbox.calls).toHaveLength(0);
	});

	it("domain_event leave submit rejects undeclared event type", async () => {
		const ports = createMemoryMutationPorts();
		const definition = getHumanResourcesMutationEmission(
			HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
		);
		await expect(
			emitHumanResourcesMutationOutcome(
				{
					commandId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
					meta: baseMeta(HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT),
					aggregateType: definition.aggregateType,
					aggregateId: "req-1",
					audit: {
						entity: "hr_leave_request",
						action: "UPDATE",
						changes: [],
					},
					event: {
						type: "human-resources.unknown.event" as typeof HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
						payload: {},
					},
				},
				ports,
			),
		).rejects.toThrow(/Undeclared HR event/);
	});

	it("conditional adjust suppresses outbox for non-emitting kinds", async () => {
		const ports = createMemoryMutationPorts();
		const definition = getHumanResourcesMutationEmission(
			HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
		);
		const result = await emitHumanResourcesMutationOutcome(
			{
				commandId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
				meta: baseMeta(HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST),
				aggregateType: definition.aggregateType,
				aggregateId: "ent-1",
				conditionalEventSuppressed: true,
				audit: {
					entity: "hr_leave_adjustment",
					entityId: "adj-1",
					action: "CREATE",
					changes: [],
				},
			},
			ports,
		);
		expect(result.ok).toBe(true);
		expect(ports.audit.calls).toHaveLength(1);
		expect(ports.outbox.calls).toHaveLength(0);
	});

	it("memory leave adjust emits one audit and one outbox for manual kind", async () => {
		const ports = createMemoryMutationPorts();
		const ready = readyHarness(ports);
		const seeded = await seedActiveEntitlement(ready, "adjust");
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const auditBefore = ports.audit.calls.length;
		const outboxBefore = ports.outbox.calls.length;

		const adjusted = await adjustLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-adjust",
				idempotencyKey: "idem-adjust",
				entitlementId: seeded.entitlement.id,
				delta: "1",
				reason: "Manual top-up",
			},
			ready,
		);
		expect(adjusted.ok).toBe(true);
		expect(ports.audit.calls.length - auditBefore).toBe(1);
		expect(ports.outbox.calls.length - outboxBefore).toBe(1);
		expect(ports.outbox.calls.at(-1)?.type).toBe(
			HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
		);
		expect(ports.audit.calls.at(-1)?.correlationId).toBe("corr-adjust");
		expect(ports.outbox.calls.at(-1)?.correlationId).toBe("corr-adjust");
	});

	it("rolls back memory state when outbox emission fails", async () => {
		const seedPorts = createMemoryMutationPorts();
		const ready = readyHarness(seedPorts);
		const seeded = await seedActiveEntitlement(ready, "rollback");
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const failingPorts = createMemoryMutationPorts({ outboxFailAfter: 0 });
		const failingReady = { ...ready, ports: failingPorts };

		const failed = await adjustLeaveEntitlement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-adjust-fail",
				idempotencyKey: "idem-adjust-fail",
				entitlementId: seeded.entitlement.id,
				delta: "1",
				reason: "Should rollback",
			},
			failingReady,
		);
		expect(failed.ok).toBe(false);

		const replay = await ready.store.findLeaveAdjustmentByIdempotencyKey({
			organizationId: ORG,
			idempotencyKey: "idem-adjust-fail",
		});
		expect(replay.ok).toBe(true);
		if (!replay.ok) return;
		expect(replay.data).toBeNull();
	});

	it("idempotent leave adjust replay does not double-emit side effects", async () => {
		const ports = createMemoryMutationPorts();
		const ready = readyHarness(ports);
		const seeded = await seedActiveEntitlement(ready, "replay");
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const input = {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "corr-adjust-replay",
			idempotencyKey: "idem-adjust-replay",
			entitlementId: seeded.entitlement.id,
			delta: "1",
			reason: "Replay test",
		};

		const first = await adjustLeaveEntitlement(input, ready);
		expect(first.ok).toBe(true);
		const auditAfterFirst = ports.audit.calls.length;
		const outboxAfterFirst = ports.outbox.calls.length;

		const second = await adjustLeaveEntitlement(input, ready);
		expect(second.ok).toBe(true);
		expect(ports.audit.calls.length).toBe(auditAfterFirst);
		expect(ports.outbox.calls.length).toBe(outboxAfterFirst);
	});

	it("submit leave request emits one audit and one domain event with shared correlation", async () => {
		const ports = createMemoryMutationPorts();
		const ready = readyHarness(ports);
		const seeded = await seedActiveEntitlement(ready, "submit");
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-draft",
				idempotencyKey: "idem-draft",
				employeeId: seeded.employee.id,
				entitlementId: seeded.entitlement.id,
				startDate: "2026-02-01",
				endDate: "2026-02-01",
				requestedQuantity: "1",
				dayPortion: "full",
				isBackdated: false,
				backdateJustification: null,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const auditBefore = ports.audit.calls.length;
		const outboxBefore = ports.outbox.calls.length;

		const submitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-submit",
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		expect(ports.audit.calls.length - auditBefore).toBe(1);
		expect(ports.outbox.calls.length - outboxBefore).toBe(1);
		expect(ports.outbox.calls.at(-1)?.type).toBe(
			HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
		);
		expect(ports.audit.calls.at(-1)?.correlationId).toBe("corr-submit");
	});
});
