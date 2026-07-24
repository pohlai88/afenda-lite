import { afterAll, expect, it } from "vitest";

import {
	createCandidate,
	getCandidate,
	listCandidates,
} from "../../src/recruitment/candidate";
import { candidateConsentFixture } from "./candidate-consent-fixture";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./hr-parity-harness";
import { createNeonOrgTracker } from "./neon-cleanup";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function runCandidateConsentSuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-cand-consent-${suffix}`);
	const OTHER_ORG = neonOrgs.trackOrg(`org-cand-consent-other-${suffix}`);
	const ACTOR = `user-cand-consent-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("persists consent facts on create and returns them on read", async () => {
		const ready = createHrParityHarness(adapter);
		const consent = candidateConsentFixture({
			consentPolicyVersion: "recruitment-v2",
			consentCapturedAt: "2026-02-01T08:30:00+08:00",
			consentSource: "self_service",
			retentionUntil: "2028-02-01",
		});

		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-create-${suffix}`,
				idempotencyKey: `idem-consent-create-${suffix}`,
				displayName: "Consent Candidate",
				email: `consent-${suffix}@example.com`,
				...consent,
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		expect(created.data.consentPolicyVersion).toBe(
			consent.consentPolicyVersion,
		);
		expect(created.data.consentSource).toBe(consent.consentSource);
		expect(created.data.retentionUntil).toBe(consent.retentionUntil);
		expect(created.data.consentWithdrawnAt).toBeNull();
		expect(created.data.consentCapturedAt?.toISOString()).toBe(
			new Date(consent.consentCapturedAt).toISOString(),
		);

		const loaded = await getCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-get-${suffix}`,
				candidateId: created.data.id,
			},
			ready,
		);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) return;
		expect(loaded.data.consentPolicyVersion).toBe(consent.consentPolicyVersion);
		expect(loaded.data.retentionUntil).toBe(consent.retentionUntil);
	});

	it("rejects retention date before consent capture date", async () => {
		const ready = createHrParityHarness(adapter);
		const result = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-retention-${suffix}`,
				idempotencyKey: `idem-consent-retention-${suffix}`,
				displayName: "Bad Retention",
				email: `bad-retention-${suffix}@example.com`,
				...candidateConsentFixture({
					consentCapturedAt: "2026-03-01T12:00:00+00:00",
					retentionUntil: "2026-02-01",
				}),
			},
			ready,
		);
		expect(result.ok).toBe(false);
	});

	it("filters candidates due for retention review", async () => {
		const ready = createHrParityHarness(adapter);
		const due = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-due-${suffix}`,
				idempotencyKey: `idem-consent-due-${suffix}`,
				displayName: "Due Candidate",
				email: `due-${suffix}@example.com`,
				...candidateConsentFixture({ retentionUntil: "2026-03-01" }),
			},
			ready,
		);
		expect(due.ok).toBe(true);
		if (!due.ok) return;

		const notDue = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-not-due-${suffix}`,
				idempotencyKey: `idem-consent-not-due-${suffix}`,
				displayName: "Future Candidate",
				email: `future-${suffix}@example.com`,
				...candidateConsentFixture({ retentionUntil: "2029-12-31" }),
			},
			ready,
		);
		expect(notDue.ok).toBe(true);
		if (!notDue.ok) return;

		const listed = await listCandidates(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-list-${suffix}`,
				retentionDueAsOf: "2026-06-01",
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;

		const ids = listed.data.candidates.map((candidate) => candidate.id);
		expect(ids).toContain(due.data.id);
		expect(ids).not.toContain(notDue.data.id);
	});

	it("isolates candidate consent reads by organization", async () => {
		const ready = createHrParityHarness(adapter);
		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-org-${suffix}`,
				idempotencyKey: `idem-consent-org-${suffix}`,
				displayName: "Org Scoped",
				email: `org-scoped-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const crossOrg = await getCandidate(
			{
				organizationId: OTHER_ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-cross-${suffix}`,
				candidateId: created.data.id,
			},
			ready,
		);
		expect(crossOrg.ok).toBe(false);
	});
}
