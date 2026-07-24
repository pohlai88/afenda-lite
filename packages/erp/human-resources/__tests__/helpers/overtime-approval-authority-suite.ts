import { afterAll, expect, it } from "vitest";

import { createEmployee } from "../../src/core/employee";
import { createEmployment } from "../../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../../src/error-codes";
import {
	approveOvertimeRequest,
	createOvertimeRequest,
	getOvertimeRequest,
	recordOvertimeActual,
} from "../../src/time/overtime";
import { assignTimeApprovalAuthority } from "../../src/time/policy";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./hr-parity-harness";
import { createNeonOrgTracker } from "./neon-cleanup";
import { humanResourcesCodeFromResult } from "./result-details";
import { uniqueSuffix } from "./time-parity-shared";

const OVERTIME_AS_OF = "2025-08-11";

export function defineOvertimeApprovalAuthoritySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-ot-auth-${suffix}`);
	const ORG_OTHER = neonOrgs.trackOrg(`${ORG}-other`);
	const ACTOR = `user-hr-ot-auth-employee-${suffix}`;
	const OUTSIDER = `user-hr-ot-auth-outsider-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	async function seedOvertimeRequest(
		ready: ReturnType<typeof createHrParityHarness>,
		seedKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	) {
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ot-auth-emp-${suffix}-${seedKey}`,
				idempotencyKey: `idem-ot-auth-emp-${suffix}-${seedKey}`,
				employeeNumber: `OTAUTH-${suffix}-${seedKey}`,
				legalName: `Overtime Authority ${suffix} ${seedKey}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) throw new Error("employee seed failed");
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ot-auth-employ-${suffix}-${seedKey}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) throw new Error("employment seed failed");
		const requested = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ot-auth-req-${suffix}-${seedKey}`,
				idempotencyKey: `idem-ot-auth-req-${suffix}-${seedKey}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-08-11T10:00:00.000Z",
				requestedEndsAt: "2025-08-11T12:00:00.000Z",
				requestedMinutes: 120,
				reason: "Authority coverage",
			},
			ready,
		);
		expect(requested.ok).toBe(true);
		if (!requested.ok) throw new Error("overtime request seed failed");
		const managerId = `user-hr-ot-auth-manager-${suffix}-${seedKey}`;
		return { request: requested.data, managerId, seedKey };
	}

	async function grantAuthority(
		ready: ReturnType<typeof createHrParityHarness>,
		input: {
			targetActorUserId: string;
			authority?: "line_manager" | "hr";
			effectiveFrom?: string;
			effectiveTo?: string | null;
			seedKey?: string;
		},
	) {
		const assigned = await assignTimeApprovalAuthority(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ot-auth-assign-${input.targetActorUserId}-${input.seedKey ?? suffix}`,
				targetActorUserId: input.targetActorUserId,
				authority: input.authority ?? "line_manager",
				effectiveFrom: input.effectiveFrom ?? "2020-01-01",
				effectiveTo: input.effectiveTo,
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) throw new Error("authority assignment failed");
	}

	it("allows an authorized approver to approve overtime", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, { targetActorUserId: managerId, seedKey });
		const outboxBefore = ready.ports.outbox.calls.length;

		const approved = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-approve-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		expect(approved.data.status).toBe("approved");
		expect(approved.data.approvedMaximumMinutes).toBe(90);
		expect(ready.ports.outbox.calls.length).toBeGreaterThan(outboxBefore);
		expect(
			ready.ports.outbox.calls.some(
				(call) => call.type === "human-resources.time.overtime.approved.v1",
			),
		).toBe(true);
	});

	it("rejects approval when actor lacks the required authority assignment", async () => {
		const ready = createHrParityHarness(adapter);
		const { request } = await seedOvertimeRequest(ready);
		const auditBefore = ready.ports.audit.calls.length;
		const outboxBefore = ready.ports.outbox.calls.length;

		const denied = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: OUTSIDER,
				correlationId: `corr-ot-auth-no-authority-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (denied.ok) return;
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const unchanged = await getOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ot-auth-read-after-deny-${suffix}`,
				requestId: request.id,
			},
			ready,
		);
		expect(unchanged.ok).toBe(true);
		if (!unchanged.ok) return;
		expect(unchanged.data?.status).toBe("requested");
		expect(ready.ports.audit.calls.length).toBe(auditBefore);
		expect(ready.ports.outbox.calls.length).toBe(outboxBefore);
	});

	it("rejects approval when caller claims an unassigned authority type", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, {
			targetActorUserId: managerId,
			authority: "hr",
			seedKey,
		});

		const denied = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-wrong-authority-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("rejects approval when assignment starts after asOf", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, {
			targetActorUserId: managerId,
			effectiveFrom: "2025-08-12",
			seedKey,
		});

		const denied = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-starts-after-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
		expect(OVERTIME_AS_OF).toBe("2025-08-11");
	});

	it("rejects approval when assignment ended before asOf", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, {
			targetActorUserId: managerId,
			effectiveFrom: "2020-01-01",
			effectiveTo: "2025-08-10",
			seedKey,
		});

		const denied = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-ended-before-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("allows approval when assignment begins exactly on asOf", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, {
			targetActorUserId: managerId,
			effectiveFrom: OVERTIME_AS_OF,
			seedKey,
		});

		const approved = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-starts-on-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
	});

	it("allows approval when assignment ends exactly on asOf", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, {
			targetActorUserId: managerId,
			effectiveFrom: "2020-01-01",
			effectiveTo: OVERTIME_AS_OF,
			seedKey,
		});

		const approved = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-ends-on-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
	});

	it("rejects cross-organization approval without revealing record existence", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, { targetActorUserId: managerId, seedKey });

		const denied = await approveOvertimeRequest(
			{
				organizationId: ORG_OTHER,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-cross-org-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
	});

	it("rejects self-approval of an overtime request", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, { targetActorUserId: ACTOR, seedKey });

		const denied = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ot-auth-self-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("rejects stale concurrency versions", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, { targetActorUserId: managerId, seedKey });

		const denied = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-stale-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version + 1,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}
	});

	it("rejects approval after overtime has moved past the approved state", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, { targetActorUserId: managerId, seedKey });

		const first = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-first-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const worked = await recordOvertimeActual(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ot-auth-worked-${suffix}`,
				requestId: first.data.id,
				actualMinutes: 75,
				expectedVersion: first.data.version,
			},
			ready,
		);
		expect(worked.ok).toBe(true);
		if (!worked.ok) return;

		const second = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-second-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: worked.data.id,
				approvedMaximumMinutes: 60,
				expectedVersion: worked.data.version,
			},
			ready,
		);
		expect(second.ok).toBe(false);
	});

	it("documents approved-to-approved retry as a repeat mutation (HR-OPS-P1-006)", async () => {
		const ready = createHrParityHarness(adapter);
		const { request, managerId, seedKey } = await seedOvertimeRequest(ready);
		await grantAuthority(ready, { targetActorUserId: managerId, seedKey });

		const first = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-reapprove-first-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: request.id,
				approvedMaximumMinutes: 90,
				expectedVersion: request.version,
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		const auditAfterFirst = ready.ports.audit.calls.length;
		const outboxAfterFirst = ready.ports.outbox.calls.length;

		const retry = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: managerId,
				correlationId: `corr-ot-auth-reapprove-second-${suffix}`,
				requestedAuthority: "line_manager",
				requestId: first.data.id,
				approvedMaximumMinutes: 60,
				expectedVersion: first.data.version,
			},
			ready,
		);
		expect(retry.ok).toBe(true);
		if (!retry.ok) return;
		expect(retry.data.approvedMaximumMinutes).toBe(60);
		expect(retry.data.version).toBe(first.data.version + 1);
		expect(ready.ports.audit.calls.length).toBeGreaterThan(auditAfterFirst);
		expect(ready.ports.outbox.calls.length).toBeGreaterThan(outboxAfterFirst);
	});
}
