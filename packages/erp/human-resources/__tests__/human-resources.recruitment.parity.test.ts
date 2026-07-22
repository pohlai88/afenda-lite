/**
 * Memory vs Drizzle parity for recruitment pipeline invariants (HR-04).
 */

import { and, db, eq, inArray, platformDomainEvent } from "@afenda/db";
import {
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
} from "@afenda/events/schemas";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
} from "../src/error-codes";
import {
	createApplication,
	moveApplicationToInReview,
} from "../src/recruitment/application";
import { createCandidate } from "../src/recruitment/candidate";
import { acceptOffer, createOffer, issueOffer } from "../src/recruitment/offer";
import {
	approveRequisition,
	createDraftRequisition,
	openRequisition,
	submitRequisition,
} from "../src/recruitment/requisition";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	createWorkforceHarness,
	type WorkforceStoreAdapter,
} from "./helpers/workforce-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function openRequisitionPipeline(
	ready: ReturnType<typeof createWorkforceHarness>,
	input: { organizationId: string; actorUserId: string; suffix: string },
) {
	const draft = await createDraftRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-draft-${input.suffix}`,
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
	for (const [statusCommand, correlation] of [
		[submitRequisition, `corr-submit-${input.suffix}`],
		[approveRequisition, `corr-approve-${input.suffix}`],
		[openRequisition, `corr-open-${input.suffix}`],
	] as const) {
		const next = await statusCommand(
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: correlation,
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

function defineRecruitmentParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-recruit-parity-${suffix}`;
	const ACTOR = `user-hr-recruit-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("runs requisition → offer accept with approved/accepted events", async () => {
		const ready = createWorkforceHarness(adapter);
		const opened = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const candidate = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cand-${suffix}`,
				idempotencyKey: `idem-cand-${suffix}`,
				displayName: "Parity Candidate",
				email: `parity-${suffix}@example.com`,
			},
			ready,
		);
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) return;

		const application = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-app-${suffix}`,
				candidateId: candidate.data.id,
				requisitionId: opened.data.id,
			},
			ready,
		);
		expect(application.ok).toBe(true);
		if (!application.ok) return;

		const inReview = await moveApplicationToInReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-${suffix}`,
				applicationId: application.data.id,
				expectedVersion: application.data.version,
			},
			ready,
		);
		expect(inReview.ok).toBe(true);
		if (!inReview.ok) return;

		const offer = await createOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-offer-${suffix}`,
				applicationId: inReview.data.id,
				termsSummary: "Parity terms",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(offer.ok).toBe(true);
		if (!offer.ok) return;

		const issued = await issueOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-issue-${suffix}`,
				offerId: offer.data.id,
				expectedVersion: offer.data.version,
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) return;

		const accepted = await acceptOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-accept-${suffix}`,
				offerId: issued.data.id,
				idempotencyKey: `idem-accept-${suffix}`,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(accepted.ok).toBe(true);
		if (!accepted.ok) return;
		expect(accepted.data.offer.status).toBe("accepted");
		expect(accepted.data.candidateId).toBe(candidate.data.id);
		expect(accepted.data.requisitionId).toBe(opened.data.id);

		if (adapter === "memory") {
			expect(
				ready.ports.outbox.calls.some(
					(call) => call.type === HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
				),
			).toBe(true);
			expect(
				ready.ports.outbox.calls.some(
					(call) => call.type === HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
				),
			).toBe(true);
			return;
		}

		const events = await db
			.select()
			.from(platformDomainEvent)
			.where(
				and(
					eq(platformDomainEvent.organizationId, ORG),
					inArray(platformDomainEvent.type, [
						HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
						HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
					]),
				),
			);
		expect(
			events.some(
				(row) => row.type === HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
			),
		).toBe(true);
		expect(
			events.some((row) => row.type === HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT),
		).toBe(true);
	});

	it("rejects open application duplicate for same candidate+requisition", async () => {
		const ready = createWorkforceHarness(adapter);
		const opened = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `dup-${suffix}`,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const candidate = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-cand-${suffix}`,
				idempotencyKey: `idem-dup-cand-${suffix}`,
				displayName: "Dup Candidate",
				email: `dup-${suffix}@example.com`,
			},
			ready,
		);
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) return;

		const first = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-app-1-${suffix}`,
				candidateId: candidate.data.id,
				requisitionId: opened.data.id,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-app-2-${suffix}`,
				candidateId: candidate.data.id,
				requisitionId: opened.data.id,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			const code = humanResourcesCodeFromResult(second);
			expect(
				code === HUMAN_RESOURCES_ERROR_CONFLICT ||
					code === HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			).toBe(true);
		}
	});
}

describe("@afenda/human-resources recruitment parity (memory)", () => {
	defineRecruitmentParitySuite("memory");
});

describe.runIf(hasDatabase)(
	"@afenda/human-resources recruitment parity (drizzle/neon)",
	() => {
		defineRecruitmentParitySuite("drizzle");
	},
);
