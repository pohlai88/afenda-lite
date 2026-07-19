/**
 * I4 adverse / recovery matrix — inventory of proofs at the right layers.
 * Browser specs tag `@smoke` / `@journey`. Skip ≠ PASS in CI when
 * `E2E_REQUIRE_FACTORY=1`.
 */

export type AdverseMatrixLayer = "unit" | "smoke" | "journey";

export type AdverseMatrixRow = {
	id: string;
	case: string;
	layers: readonly AdverseMatrixLayer[];
	evidence: readonly string[];
	requiresFactory: boolean;
};

/** Standing adverse / recovery cases for GUIDE-018 I4 exit. */
export const ADVERSE_MATRIX = [
	{
		id: "A1",
		case: "anonymous → protected shells → /auth/login",
		layers: ["smoke"],
		evidence: ["e2e/smoke/anonymous-gate.spec.ts"],
		requiresFactory: false,
	},
	{
		id: "A2",
		case: "wrong-role shell → /403 (operator↔client)",
		layers: ["smoke"],
		evidence: ["e2e/smoke/wrong-role-gate.spec.ts"],
		requiresFactory: true,
	},
	{
		id: "A3",
		case: "two-org denial (SQL membership + session stays orgA)",
		layers: ["smoke"],
		evidence: ["e2e/smoke/two-org-denial.spec.ts"],
		requiresFactory: true,
	},
	{
		id: "A4",
		case: "action permission denial → FORBIDDEN ActionResult",
		layers: ["unit"],
		evidence: ["apps/web/__tests__/n14-security-failure-verification.test.ts"],
		requiresFactory: false,
	},
	{
		id: "A5",
		case: "invite → join accept (write + membership recovery path)",
		layers: ["journey"],
		evidence: ["e2e/journey/invite-join.spec.ts"],
		requiresFactory: true,
	},
] as const satisfies readonly AdverseMatrixRow[];

export type AdverseMatrixId = (typeof ADVERSE_MATRIX)[number]["id"];
