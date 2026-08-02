/**
 * Memory vs Drizzle parity for recruitment pipeline invariants (HR-04).
 */

import {
	database as afendaDatabase,
	and,
	eq,
	inArray,
	platformDomainEvent,
} from "@afenda/db";
import {
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
} from "@afenda/events/schemas";
import { afterAll, describe, expect, it } from "vitest";
import {
	createApplication,
	listApplicationStatusHistory,
	moveApplicationToInReview,
	rejectApplication,
	reopenApplication,
} from "../src/features/recruitment/application";
import { createCandidate } from "../src/features/recruitment/candidate";
import { acceptOffer } from "../src/features/recruitment/offer";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
} from "../src/kernel/execution/error-codes";
import { candidateConsentFixture } from "./helpers/candidate-consent-fixture";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { createAndIssueOffer } from "./helpers/offer-lifecycle-fixture";
import {
	expectRequisitionPipeline,
	seedRequisitionPipeline,
} from "./helpers/recruitment-requisition-fixture";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineRecruitmentParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-recruit-parity-${suffix}`);
	const DUP_ORG = neonOrgs.trackOrg(`org-hr-recruit-dup-${suffix}`);
	const ACTOR = `user-hr-recruit-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("runs requisition → offer accept with approved/accepted events", async () => {
		const ready = createHrParityHarness(adapter);
		const opened = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: suffix,
			targetStatus: "open",
			title: "Parity hire",
		});
		expectRequisitionPipeline(opened);

		const candidate = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cand-${suffix}`,
				idempotencyKey: `idem-cand-${suffix}`,
				displayName: "Parity Candidate",
				email: `parity-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) {
			return;
		}

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
		if (!application.ok) {
			return;
		}

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
		if (!inReview.ok) {
			return;
		}

		const issued = await createAndIssueOffer(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			applicationId: inReview.data.id,
			termsSummary: "Parity terms",
			expiresOn: "2030-12-31",
			correlationPrefix: `corr-offer-${suffix}`,
		});
		expect(issued.ok).toBe(true);
		if (!issued.ok) {
			return;
		}

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
		if (!accepted.ok) {
			return;
		}
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

		const events = await afendaDatabase.client
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
		const ready = createHrParityHarness(adapter);
		const opened = await seedRequisitionPipeline(ready, {
			organizationId: DUP_ORG,
			actorUserId: ACTOR,
			tag: `dup-${suffix}`,
			targetStatus: "open",
			title: "Parity hire",
		});
		expectRequisitionPipeline(opened);

		const candidate = await createCandidate(
			{
				organizationId: DUP_ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-cand-${suffix}`,
				idempotencyKey: `idem-dup-cand-${suffix}`,
				displayName: "Dup Candidate",
				email: `dup-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) {
			return;
		}

		const first = await createApplication(
			{
				organizationId: DUP_ORG,
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
				organizationId: DUP_ORG,
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

	it("Slice 6.3 — reopen rejected application and lists reason history", async () => {
		const ready = createHrParityHarness(adapter);
		const opened = await seedRequisitionPipeline(ready, {
			organizationId: DUP_ORG,
			actorUserId: ACTOR,
			tag: `s63-${suffix}`,
			targetStatus: "open",
			title: "Parity reopen",
		});
		expectRequisitionPipeline(opened);

		const candidate = await createCandidate(
			{
				organizationId: DUP_ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s63-cand-${suffix}`,
				idempotencyKey: `idem-s63-cand-${suffix}`,
				displayName: "Slice 6.3 Candidate",
				email: `s63-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) {
			return;
		}

		const application = await createApplication(
			{
				organizationId: DUP_ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s63-app-${suffix}`,
				candidateId: candidate.data.id,
				requisitionId: opened.data.id,
			},
			ready,
		);
		expect(application.ok).toBe(true);
		if (!application.ok) {
			return;
		}

		const rejected = await rejectApplication(
			{
				organizationId: DUP_ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s63-reject-${suffix}`,
				applicationId: application.data.id,
				expectedVersion: application.data.version,
				reason: "Not a fit",
			},
			ready,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) {
			return;
		}

		const reopened = await reopenApplication(
			{
				organizationId: DUP_ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s63-reopen-${suffix}`,
				applicationId: rejected.data.id,
				expectedVersion: rejected.data.version,
				reasonCode: "reconsider",
			},
			ready,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) {
			return;
		}
		expect(reopened.data.status).toBe("submitted");

		const history = await listApplicationStatusHistory(
			{
				organizationId: DUP_ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s63-history-${suffix}`,
				applicationId: application.data.id,
			},
			ready,
		);
		expect(history.ok).toBe(true);
		if (!history.ok) {
			return;
		}
		expect(history.data.length).toBeGreaterThanOrEqual(3);
		expect(history.data.at(-2)?.toStatus).toBe("rejected");
		expect(history.data.at(-2)?.reason).toBe("Not a fit");
		expect(history.data.at(-1)?.toStatus).toBe("submitted");
		expect(history.data.at(-1)?.reasonCode).toBe("reconsider");
	});

	it("Slice 6.5 — offer approve gate and compensation proposal FK parity", async () => {
		const ready = createHrParityHarness(adapter);
		const opened = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `${suffix}-s65`,
			targetStatus: "open",
			title: "Slice 6.5 parity",
		});
		expectRequisitionPipeline(opened);

		const candidate = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-cand-${suffix}`,
				idempotencyKey: `idem-s65-cand-${suffix}`,
				displayName: "Slice 6.5 Candidate",
				email: `s65-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) {
			return;
		}

		const application = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-app-${suffix}`,
				candidateId: candidate.data.id,
				requisitionId: opened.data.id,
			},
			ready,
		);
		expect(application.ok).toBe(true);
		if (!application.ok) {
			return;
		}

		const inReview = await moveApplicationToInReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-review-${suffix}`,
				applicationId: application.data.id,
				expectedVersion: application.data.version,
			},
			ready,
		);
		expect(inReview.ok).toBe(true);
		if (!inReview.ok) {
			return;
		}

		const issued = await createAndIssueOffer(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			applicationId: inReview.data.id,
			termsSummary: "Slice 6.5 parity offer",
			expiresOn: "2030-12-31",
			correlationPrefix: `corr-s65-${suffix}`,
		});
		expect(issued.ok).toBe(true);
		if (!issued.ok) {
			return;
		}
		expect(issued.data.status).toBe("issued");
		expect(issued.data.compensationProposalId).not.toBeNull();
	});
}

describe("@afenda/human-resources recruitment parity (memory)", () => {
	defineRecruitmentParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"@afenda/human-resources recruitment parity (drizzle/neon)",
	() => {
		defineRecruitmentParitySuite("drizzle");
	},
);
