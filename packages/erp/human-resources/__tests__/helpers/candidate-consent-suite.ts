import { afterAll, expect, it } from "vitest";
import {
	anonymizeCandidate,
	changeCandidateRetention,
	createCandidate,
	detectCandidateDuplicates,
	getCandidate,
	listCandidates,
	updateCandidateProfile,
	withdrawCandidateConsent,
} from "../../src/features/recruitment/candidate";
import { ANONYMIZED_CANDIDATE_DISPLAY_NAME } from "../../src/features/recruitment/guards";
import { CANDIDATE_CONSENT_SOURCES } from "../../src/features/recruitment/status";
import { HUMAN_RESOURCES_ERROR_DUPLICATE } from "../../src/kernel/execution/error-codes";
import {
	runSequential,
	sequentialReturn,
} from "../../src/kernel/execution/run-sequential";
import { candidateConsentFixture } from "./candidate-consent-fixture";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./hr-parity-harness";
import { createNeonOrgTracker } from "./neon-cleanup";
import { humanResourcesCodeFromResult } from "./result-details";

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
		if (!created.ok) {
			return;
		}

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
		if (!loaded.ok) {
			return;
		}
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
		if (!due.ok) {
			return;
		}

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
		if (!notDue.ok) {
			return;
		}

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
		if (!listed.ok) {
			return;
		}

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
		if (!created.ok) {
			return;
		}

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

	it("withdraws candidate consent and rejects double withdrawal", async () => {
		const ready = createHrParityHarness(adapter);
		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-withdraw-create-${suffix}`,
				idempotencyKey: `idem-consent-withdraw-create-${suffix}`,
				displayName: "Withdraw Candidate",
				email: `withdraw-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const withdrawn = await withdrawCandidateConsent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-withdraw-${suffix}`,
				candidateId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(withdrawn.ok).toBe(true);
		if (!withdrawn.ok) {
			return;
		}
		expect(withdrawn.data.consentWithdrawnAt).not.toBeNull();

		const again = await withdrawCandidateConsent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-withdraw-again-${suffix}`,
				candidateId: created.data.id,
				expectedVersion: withdrawn.data.version,
			},
			ready,
		);
		expect(again.ok).toBe(false);
	});

	it("changes candidate retention and rejects after consent withdrawal", async () => {
		const ready = createHrParityHarness(adapter);
		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-retention-create-${suffix}`,
				idempotencyKey: `idem-consent-retention-create-${suffix}`,
				displayName: "Retention Candidate",
				email: `retention-${suffix}@example.com`,
				...candidateConsentFixture({ retentionUntil: "2028-01-15" }),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const changed = await changeCandidateRetention(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-retention-change-${suffix}`,
				candidateId: created.data.id,
				retentionUntil: "2029-06-01",
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(changed.ok).toBe(true);
		if (!changed.ok) {
			return;
		}
		expect(changed.data.retentionUntil).toBe("2029-06-01");

		const withdrawn = await withdrawCandidateConsent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-retention-withdraw-${suffix}`,
				candidateId: changed.data.id,
				expectedVersion: changed.data.version,
			},
			ready,
		);
		expect(withdrawn.ok).toBe(true);
		if (!withdrawn.ok) {
			return;
		}

		const blocked = await changeCandidateRetention(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-retention-blocked-${suffix}`,
				candidateId: withdrawn.data.id,
				retentionUntil: "2030-01-01",
				expectedVersion: withdrawn.data.version,
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
	});

	it("rejects retention change before consent capture date", async () => {
		const ready = createHrParityHarness(adapter);
		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-retention-early-create-${suffix}`,
				idempotencyKey: `idem-consent-retention-early-create-${suffix}`,
				displayName: "Early Retention",
				email: `early-retention-${suffix}@example.com`,
				...candidateConsentFixture({
					consentCapturedAt: "2026-03-01T12:00:00+00:00",
					retentionUntil: "2028-03-01",
				}),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const blocked = await changeCandidateRetention(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-consent-retention-early-${suffix}`,
				candidateId: created.data.id,
				retentionUntil: "2026-02-01",
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
	});

	it("rejects duplicate candidate email on create", async () => {
		const ready = createHrParityHarness(adapter);
		const email = `dup-${suffix}@example.com`;
		const first = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-first-${suffix}`,
				idempotencyKey: `idem-dup-first-${suffix}`,
				displayName: "First Dup",
				email,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const second = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-second-${suffix}`,
				idempotencyKey: `idem-dup-second-${suffix}`,
				displayName: "Second Dup",
				email,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (second.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(second)).toBe(
			HUMAN_RESOURCES_ERROR_DUPLICATE,
		);
	});

	it("updates candidate profile", async () => {
		const ready = createHrParityHarness(adapter);
		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-create-${suffix}`,
				idempotencyKey: `idem-profile-create-${suffix}`,
				displayName: "Profile Candidate",
				email: `profile-${suffix}@example.com`,
				phone: "+10000000001",
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const updated = await updateCandidateProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-update-${suffix}`,
				candidateId: created.data.id,
				displayName: "Profile Updated",
				phone: "+10000000002",
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}
		expect(updated.data.displayName).toBe("Profile Updated");
		expect(updated.data.phone).toBe("+10000000002");
	});

	it("persists each consentSource for source attribution", async () => {
		const ready = createHrParityHarness(adapter);
		const sequentialOutcome1 = await runSequential(
			CANDIDATE_CONSENT_SOURCES,
			async (consentSource) => {
				const created = await createCandidate(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: `corr-source-${consentSource}-${suffix}`,
						idempotencyKey: `idem-source-${consentSource}-${suffix}`,
						displayName: `Source ${consentSource}`,
						email: `source-${consentSource}-${suffix}@example.com`,
						...candidateConsentFixture({ consentSource }),
					},
					ready,
				);
				expect(created.ok).toBe(true);
				if (!created.ok) {
					return sequentialReturn(undefined);
				}
				expect(created.data.consentSource).toBe(consentSource);
			},
		);
		if (sequentialOutcome1.kind === "return") {
			return sequentialOutcome1.value;
		}
	});

	it("searches candidates by name and email query text", async () => {
		const ready = createHrParityHarness(adapter);
		const named = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-search-name-${suffix}`,
				idempotencyKey: `idem-search-name-${suffix}`,
				displayName: `Searchable Name ${suffix}`,
				email: `other-search-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(named.ok).toBe(true);
		if (!named.ok) {
			return;
		}

		const emailed = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-search-email-${suffix}`,
				idempotencyKey: `idem-search-email-${suffix}`,
				displayName: "Plain Candidate",
				email: `searchable-email-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(emailed.ok).toBe(true);
		if (!emailed.ok) {
			return;
		}

		const byName = await listCandidates(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-search-by-name-${suffix}`,
				query: `Searchable Name ${suffix}`,
			},
			ready,
		);
		expect(byName.ok).toBe(true);
		if (!byName.ok) {
			return;
		}
		expect(byName.data.candidates.map((c) => c.id)).toContain(named.data.id);
		expect(byName.data.candidates.map((c) => c.id)).not.toContain(
			emailed.data.id,
		);

		const byEmail = await listCandidates(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-search-by-email-${suffix}`,
				query: `searchable-email-${suffix}`,
			},
			ready,
		);
		expect(byEmail.ok).toBe(true);
		if (!byEmail.ok) {
			return;
		}
		expect(byEmail.data.candidates.map((c) => c.id)).toContain(emailed.data.id);
		expect(byEmail.data.candidates.map((c) => c.id)).not.toContain(
			named.data.id,
		);
	});

	it("detects candidate duplicates by email and display name", async () => {
		const ready = createHrParityHarness(adapter);
		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-detect-create-${suffix}`,
				idempotencyKey: `idem-detect-create-${suffix}`,
				displayName: `Detect Twin ${suffix}`,
				email: `detect-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const byEmail = await detectCandidateDuplicates(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-detect-email-${suffix}`,
				email: `Detect-${suffix}@example.com`,
			},
			ready,
		);
		expect(byEmail.ok).toBe(true);
		if (!byEmail.ok) {
			return;
		}
		expect(byEmail.data.some((m) => m.candidateId === created.data.id)).toBe(
			true,
		);
		expect(
			byEmail.data.find((m) => m.candidateId === created.data.id)?.matchReasons,
		).toContain("email");

		const byName = await detectCandidateDuplicates(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-detect-name-${suffix}`,
				displayName: `detect twin ${suffix}`,
			},
			ready,
		);
		expect(byName.ok).toBe(true);
		if (!byName.ok) {
			return;
		}
		expect(byName.data.some((m) => m.candidateId === created.data.id)).toBe(
			true,
		);

		const crossOrg = await detectCandidateDuplicates(
			{
				organizationId: OTHER_ORG,
				actorUserId: ACTOR,
				correlationId: `corr-detect-cross-${suffix}`,
				email: `detect-${suffix}@example.com`,
			},
			ready,
		);
		expect(crossOrg.ok).toBe(true);
		if (!crossOrg.ok) {
			return;
		}
		expect(crossOrg.data).toHaveLength(0);
	});

	it("anonymizes due candidate, frees email, and blocks further mutations", async () => {
		const ready = createHrParityHarness(adapter);
		const originalEmail = `anon-free-${suffix}@example.com`;
		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-create-${suffix}`,
				idempotencyKey: `idem-anon-create-${suffix}`,
				displayName: "Anon Candidate",
				email: originalEmail,
				phone: "+15551212",
				...candidateConsentFixture({ retentionUntil: "2026-03-01" }),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const early = await anonymizeCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-early-${suffix}`,
				candidateId: created.data.id,
				expectedVersion: created.data.version,
				asOf: "2026-02-01",
			},
			ready,
		);
		expect(early.ok).toBe(false);

		const anonymized = await anonymizeCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-${suffix}`,
				candidateId: created.data.id,
				expectedVersion: created.data.version,
				asOf: "2026-06-01",
			},
			ready,
		);
		expect(anonymized.ok).toBe(true);
		if (!anonymized.ok) {
			return;
		}
		expect(anonymized.data.status).toBe("anonymized");
		expect(anonymized.data.displayName).toBe(ANONYMIZED_CANDIDATE_DISPLAY_NAME);
		expect(anonymized.data.phone).toBeNull();
		expect(anonymized.data.email).toContain(created.data.id);
		expect(anonymized.data.consentSource).toBe("recruiter_recorded");

		const profileBlocked = await updateCandidateProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-profile-blocked-${suffix}`,
				candidateId: anonymized.data.id,
				displayName: "Should Fail",
				expectedVersion: anonymized.data.version,
			},
			ready,
		);
		expect(profileBlocked.ok).toBe(false);

		const retentionBlocked = await changeCandidateRetention(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-retention-blocked-${suffix}`,
				candidateId: anonymized.data.id,
				retentionUntil: "2030-01-01",
				expectedVersion: anonymized.data.version,
			},
			ready,
		);
		expect(retentionBlocked.ok).toBe(false);

		const withdrawBlocked = await withdrawCandidateConsent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-withdraw-blocked-${suffix}`,
				candidateId: anonymized.data.id,
				expectedVersion: anonymized.data.version,
			},
			ready,
		);
		expect(withdrawBlocked.ok).toBe(false);

		const reused = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-reuse-${suffix}`,
				idempotencyKey: `idem-anon-reuse-${suffix}`,
				displayName: "Reused Email",
				email: originalEmail,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(reused.ok).toBe(true);
		if (!reused.ok) {
			return;
		}

		const duplicates = await detectCandidateDuplicates(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-detect-${suffix}`,
				email: originalEmail,
			},
			ready,
		);
		expect(duplicates.ok).toBe(true);
		if (!duplicates.ok) {
			return;
		}
		expect(
			duplicates.data.some((m) => m.candidateId === anonymized.data.id),
		).toBe(false);
		expect(duplicates.data.some((m) => m.candidateId === reused.data.id)).toBe(
			true,
		);
	});

	it("anonymizes after consent withdrawal", async () => {
		const ready = createHrParityHarness(adapter);
		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-withdraw-create-${suffix}`,
				idempotencyKey: `idem-anon-withdraw-create-${suffix}`,
				displayName: "Withdraw Anon",
				email: `anon-withdraw-${suffix}@example.com`,
				...candidateConsentFixture({ retentionUntil: "2030-01-01" }),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const withdrawn = await withdrawCandidateConsent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-withdraw-${suffix}`,
				candidateId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(withdrawn.ok).toBe(true);
		if (!withdrawn.ok) {
			return;
		}

		const anonymized = await anonymizeCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-anon-after-withdraw-${suffix}`,
				candidateId: withdrawn.data.id,
				expectedVersion: withdrawn.data.version,
				asOf: "2026-01-01",
			},
			ready,
		);
		expect(anonymized.ok).toBe(true);
		if (!anonymized.ok) {
			return;
		}
		expect(anonymized.data.status).toBe("anonymized");
	});
}
