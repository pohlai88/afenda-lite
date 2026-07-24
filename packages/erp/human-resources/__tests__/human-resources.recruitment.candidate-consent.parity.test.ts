/**
 * Candidate consent contract — Drizzle/Neon parity (HR-COREORG-P0-001).
 */

import { describe } from "vitest";

import { runCandidateConsentSuite } from "./helpers/candidate-consent-suite";
import { runDrizzleParity } from "./helpers/database-gate";

describe.skipIf(!runDrizzleParity)(
	"@afenda/human-resources candidate consent (drizzle/neon)",
	() => {
		runCandidateConsentSuite("drizzle");
	},
);
