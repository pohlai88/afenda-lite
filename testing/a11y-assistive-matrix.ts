/**
 * GUIDE-018 I5.4 A11Y03 — Playwright axe + skip-link / focus ownership journeys.
 * Standing smoke covers public shells without factory; authenticated rows skip
 * locally when factory env is incomplete (CI standing gate still fail-closed).
 */

export type A11yAssistiveAuth = "none" | "operator" | "client";

export type A11yAssistiveRow = {
	id: string;
	path: string;
	auth: A11yAssistiveAuth;
	/** Checks asserted by `e2e/smoke/a11y-assistive-matrix.spec.ts`. */
	checks: readonly ("axe" | "skip-link")[];
	notes: string;
};

export const A11Y_ASSISTIVE_MATRIX = [
	{
		id: "A11Y03-P1",
		path: "/auth/login",
		auth: "none",
		checks: ["axe", "skip-link"],
		notes: "Public Neon Auth login island — no factory.",
	},
	{
		id: "A11Y03-P2",
		path: "/403",
		auth: "none",
		checks: ["axe", "skip-link"],
		notes: "Forbidden shell — no factory.",
	},
	{
		id: "A11Y03-P3",
		path: "/admin",
		auth: "operator",
		checks: ["axe", "skip-link"],
		notes: "Operator platform shell after factory operator login.",
	},
	{
		id: "A11Y03-P4",
		path: "/client/declarations",
		auth: "client",
		checks: ["axe", "skip-link"],
		notes: "Client declarations list after factory client login.",
	},
] as const satisfies readonly A11yAssistiveRow[];

export type A11yAssistiveId = (typeof A11Y_ASSISTIVE_MATRIX)[number]["id"];
