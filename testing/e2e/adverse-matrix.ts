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
		case: "wrong-permission vertical → /403 (fft.access)",
		layers: ["smoke"],
		evidence: ["e2e/smoke/fft-permitted-vertical.spec.ts"],
		requiresFactory: true,
	},
	{
		id: "A5",
		case: "invite → join accept (write + membership recovery path)",
		layers: ["journey"],
		evidence: ["e2e/journey/invite-join.spec.ts"],
		requiresFactory: true,
	},
	{
		id: "A6",
		case: "declaration draft save → reopen recover → submit",
		layers: ["journey"],
		evidence: ["e2e/journey/declarations-draft-recovery.spec.ts"],
		requiresFactory: true,
	},
	{
		id: "A7",
		case: "invalid input — empty submit / submit without draft",
		layers: ["unit", "journey"],
		evidence: [
			"apps/web/__tests__/declaration-submit-read.test.ts",
			"e2e/journey/declarations-adverse-recovery.spec.ts",
		],
		requiresFactory: true,
	},
	{
		id: "A8",
		case: "stale / locked write after finalize",
		layers: ["unit", "journey"],
		evidence: [
			"apps/web/__tests__/declaration-submit-read.test.ts",
			"e2e/journey/declarations-adverse-recovery.spec.ts",
		],
		requiresFactory: true,
	},
	{
		id: "A9",
		case: "duplicate / idempotent re-submit",
		layers: ["unit", "journey"],
		evidence: [
			"apps/web/__tests__/declaration-submit-read.test.ts",
			"e2e/journey/declarations-adverse-recovery.spec.ts",
		],
		requiresFactory: true,
	},
	{
		id: "A10",
		case: "concurrent double-submit race → stable confirmation",
		layers: ["unit"],
		evidence: ["apps/web/__tests__/declaration-submit-read.test.ts"],
		requiresFactory: false,
	},
	{
		id: "A11",
		case: "dependency throw → safe INTERNAL_ERROR ActionResult",
		layers: ["unit"],
		evidence: ["apps/web/__tests__/submit-client-declaration-action.test.ts"],
		requiresFactory: false,
	},
] as const satisfies readonly AdverseMatrixRow[];

export type AdverseMatrixId = (typeof ADVERSE_MATRIX)[number]["id"];
