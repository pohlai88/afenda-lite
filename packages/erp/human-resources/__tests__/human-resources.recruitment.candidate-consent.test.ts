/**
 * Candidate consent contract — Memory validation (HR-COREORG-P0-001).
 */

import { describe } from "vitest";

import { runCandidateConsentSuite } from "./helpers/candidate-consent-suite";

describe("@afenda/human-resources candidate consent (memory)", () => {
	runCandidateConsentSuite("memory");
});
