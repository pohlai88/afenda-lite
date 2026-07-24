import type { CreateCandidateInput } from "../../src/schemas/recruitment";

type CandidateConsentFixtureInput = Pick<
	CreateCandidateInput,
	| "consentPolicyVersion"
	| "consentCapturedAt"
	| "consentSource"
	| "retentionUntil"
>;

export function candidateConsentFixture(
	overrides: Partial<CandidateConsentFixtureInput> = {},
): CandidateConsentFixtureInput {
	const consentCapturedAt =
		overrides.consentCapturedAt ?? "2026-01-15T10:00:00+00:00";
	return {
		consentPolicyVersion: overrides.consentPolicyVersion ?? "recruitment-v1",
		consentCapturedAt,
		consentSource: overrides.consentSource ?? "recruiter_recorded",
		retentionUntil: overrides.retentionUntil ?? "2028-01-15",
	};
}
