/**
 * Memory vs Drizzle parity for workforce planning invariants (HR-WFP-01).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_ERROR_INVALID_INPUT } from "../src/error-codes";
import {
	approveRequisition,
	cancelRequisition,
	createDraftRequisition,
	openRequisition,
	submitRequisition,
} from "../src/recruitment/requisition";
import {
	approveHeadcountPlan,
	createHeadcountPlan,
	submitHeadcountPlan,
} from "../src/workforce-planning/headcount-plan";
import { addHeadcountPlanLine } from "../src/workforce-planning/headcount-plan-line";
import {
	getHeadcountAvailability,
	listHeadcountReservations,
	reserveHeadcount,
} from "../src/workforce-planning/headcount-reservation";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function approvePlanWithLine(
	ready: ReturnType<typeof createHrParityHarness>,
	input: { organizationId: string; actorUserId: string; suffix: string },
) {
	const plan = await createHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-plan-${input.suffix}`,
			idempotencyKey: `idem-plan-${input.suffix}`,
			code: `WFP-${input.suffix}`.slice(0, 32),
			title: "Parity plan",
			planningScopeKey: `scope-${input.suffix}`,
			periodStart: "2026-01-01",
			periodEnd: "2026-12-31",
		},
		ready,
	);
	if (!plan.ok) {
		return plan;
	}

	const seeded = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: `corr-seed-${input.suffix}`,
	});
	if (!seeded) {
		return { ok: false as const, error: { code: "INTERNAL_ERROR" as const } };
	}

	const line = await addHeadcountPlanLine(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-line-${input.suffix}`,
			planId: plan.data.id,
			departmentId: seeded.departmentId,
			jobId: seeded.jobId,
			plannedFte: "1.0000",
			plannedHeadcount: 1,
		},
		ready,
	);
	if (!line.ok) {
		return line;
	}

	let currentPlan = plan.data;
	const submitted = await submitHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-submit-${input.suffix}`,
			planId: currentPlan.id,
			expectedVersion: currentPlan.version,
		},
		ready,
	);
	if (!submitted.ok) {
		return submitted;
	}
	currentPlan = submitted.data;

	const approved = await approveHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-approve-${input.suffix}`,
			planId: currentPlan.id,
			expectedVersion: currentPlan.version,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	return { ok: true as const, data: { plan: approved.data, line: line.data } };
}

async function openRequisitionPipeline(
	ready: ReturnType<typeof createHrParityHarness>,
	input: { organizationId: string; actorUserId: string; suffix: string },
) {
	const draft = await createDraftRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-req-${input.suffix}`,
			idempotencyKey: `idem-req-${input.suffix}`,
			code: `REQ-${input.suffix}`.slice(0, 32),
			title: "Parity hire",
		},
		ready,
	);
	if (!draft.ok) {
		return draft;
	}

	let requisition = draft.data;
	for (const [cmd, corr] of [
		[submitRequisition, `corr-req-submit-${input.suffix}`],
		[approveRequisition, `corr-req-approve-${input.suffix}`],
		[openRequisition, `corr-req-open-${input.suffix}`],
	] as const) {
		const next = await cmd(
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: corr,
				requisitionId: requisition.id,
				expectedVersion: requisition.version,
			},
			ready,
		);
		if (!next.ok) {
			return next;
		}
		requisition = next.data;
	}
	return { ok: true as const, data: requisition };
}

function defineWorkforcePlanningParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-wfp-parity-${suffix}`;
	const ACTOR = `user-hr-wfp-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("reserves headcount against approved plan and releases on cancel", async () => {
		const ready = createHrParityHarness(adapter);
		const approved = await approvePlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-${suffix}`,
				idempotencyKey: `idem-res-${suffix}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) return;

		const availabilityAfterReserve = await getHeadcountAvailability(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-avail-1-${suffix}`,
				planLineId: approved.data.line.id,
			},
			ready,
		);
		expect(availabilityAfterReserve.ok).toBe(true);
		if (availabilityAfterReserve.ok) {
			expect(availabilityAfterReserve.data.lines[0]?.availableHeadcount).toBe(
				0,
			);
		}

		const cancelled = await cancelRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cancel-${suffix}`,
				requisitionId: requisition.data.id,
				expectedVersion: requisition.data.version,
			},
			ready,
		);
		expect(cancelled.ok).toBe(true);

		const listed = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-${suffix}`,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.reservations[0]?.status).toBe("released");
		}

		const availabilityAfterRelease = await getHeadcountAvailability(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-avail-2-${suffix}`,
				planLineId: approved.data.line.id,
			},
			ready,
		);
		expect(availabilityAfterRelease.ok).toBe(true);
		if (availabilityAfterRelease.ok) {
			expect(availabilityAfterRelease.data.lines[0]?.availableHeadcount).toBe(
				1,
			);
		}
	});

	it("rejects over-reservation consistently", async () => {
		const ready = createHrParityHarness(adapter);
		const approved = await approvePlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `over-${suffix}`,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `over-${suffix}`,
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-over-${suffix}`,
				idempotencyKey: `idem-over-${suffix}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "2.0000",
				reservedHeadcount: 2,
			},
			ready,
		);
		expect(reserved.ok).toBe(false);
		if (!reserved.ok) {
			expect(humanResourcesCodeFromResult(reserved)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		}
	});
}

describe("@afenda/human-resources workforce planning parity (memory)", () => {
	defineWorkforcePlanningParitySuite("memory");
});

describe.skipIf(!hasDatabase)(
	"@afenda/human-resources workforce planning parity (drizzle)",
	() => {
		defineWorkforcePlanningParitySuite("drizzle");
	},
);
