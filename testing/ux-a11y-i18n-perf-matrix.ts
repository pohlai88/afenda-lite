/**
 * GUIDE-018 I5.4 — declared UX states + a11y / i18n / perf criteria with owners.
 * FE CWV lab budgets are adopted from Google’s published “good” thresholds in
 * `testing/fe-cwv-budgets.ts` (workload · env · percentile · regression trigger ·
 * owner). Do not invent alternate numeric thresholds here.
 */

export type UxCriteriaPillar = "ux" | "a11y" | "i18n" | "perf";

/** GUIDE-017 evidence states (underscore form for TS identifiers). */
export type UxCriteriaEvidenceState =
	| "PASS"
	| "FAIL"
	| "BLOCKED"
	| "NOT_EVIDENCED"
	| "NOT_APPLICABLE";

export type UxCriteriaRow = {
	id: string;
	pillar: UxCriteriaPillar;
	criterion: string;
	owner: string;
	evidenceState: UxCriteriaEvidenceState;
	/** Repo-relative paths that must exist when evidenceState is PASS. */
	evidencePaths: readonly string[];
	notes: string;
};

/** Standing I5.4 criteria inventory — Platform owns aggregation unless noted. */
export const UX_A11Y_I18N_PERF_MATRIX = [
	{
		id: "UX01",
		pillar: "ux",
		criterion:
			"Authenticated product segments expose instant loading UI (ARCH-016 loading.tsx)",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"apps/web/app/(operator)/loading.tsx",
			"apps/web/app/(client)/client/(workspace)/loading.tsx",
			"apps/web/features/auth/segment-loading.tsx",
		],
		notes:
			"Operator + client workspace; SegmentLoading via @afenda/ui-system Spinner.",
	},
	{
		id: "UX02",
		pillar: "ux",
		criterion:
			"Authenticated product segments expose safe error boundaries (ARCH-016 error.tsx)",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"apps/web/app/(operator)/error.tsx",
			"apps/web/app/(client)/client/(workspace)/error.tsx",
			"apps/web/features/auth/segment-error.tsx",
			"apps/web/features/auth/safe-error-copy.ts",
		],
		notes:
			"SegmentError + safe-error-copy; auth/join public segments also covered.",
	},
	{
		id: "UX03",
		pillar: "ux",
		criterion: "Public auth/join segments expose loading + error fallbacks",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"apps/web/app/(public)/auth/loading.tsx",
			"apps/web/app/(public)/auth/error.tsx",
			"apps/web/app/(public)/join/loading.tsx",
			"apps/web/app/(public)/join/error.tsx",
		],
		notes:
			"Root global-error / app-level not-found are out of this authenticated-segment bar.",
	},
	{
		id: "UX04",
		pillar: "ux",
		criterion: "Wrong-role / forbidden shell routes to /403",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"apps/web/app/(public)/403/page.tsx",
			"apps/web/features/auth/forbidden-shell.tsx",
			"e2e/smoke/wrong-role-gate.spec.ts",
		],
		notes: "I4 A2/A4 browser proof; ForbiddenShell product surface.",
	},
	{
		id: "UX05",
		pillar: "ux",
		criterion:
			"In-scope list/panel empty states declared on Declarations · FFT · org-admin tables",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"apps/web/features/declarations",
			"apps/web/features/fft",
			"apps/web/features/org-admin",
		],
		notes:
			"DataTable emptyTitle/emptyDescription patterns; directories as path evidence.",
	},
	{
		id: "UX06",
		pillar: "ux",
		criterion:
			"Mutation forms declare pending/submitting (aria-busy) on org-admin + declaration writes",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"apps/web/__tests__/assign-org-role-form.interaction.test.tsx",
			"apps/web/__tests__/org-admin-panels.interaction.test.tsx",
		],
		notes:
			"useActionState pending + Spinner; interaction tests assert aria-busy.",
	},
	{
		id: "A11Y01",
		pillar: "a11y",
		criterion:
			"Product UI primitives enter only via @afenda/ui-system flat barrel (ADR-010)",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: ["apps/web/__tests__/ui-boundary.test.ts"],
		notes:
			"ui-boundary Vitest gate; shadcn-studio DNA excluded from product imports.",
	},
	{
		id: "A11Y02",
		pillar: "a11y",
		criterion:
			"Org-admin mutation forms announce busy state and labeled Combobox controls",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"apps/web/__tests__/assign-org-role-form.interaction.test.tsx",
			"apps/web/__tests__/org-admin-panels.interaction.test.tsx",
		],
		notes: "Narrow floor — not a full WCAG claim.",
	},
	{
		id: "A11Y03",
		pillar: "a11y",
		criterion:
			"Playwright axe / assistive-tech matrix + skip-link / focus ownership for in-scope journeys",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"testing/a11y-assistive-matrix.ts",
			"testing/e2e/a11y.ts",
			"e2e/smoke/a11y-assistive-matrix.spec.ts",
			"apps/web/features/auth/skip-to-main-content.tsx",
			"apps/web/features/auth/main-content.ts",
		],
		notes:
			"@axe-core/playwright WCAG 2.1 A/AA serious/critical gate + skip-link first-Tab → #main-content focus; public always · authenticated when factory ready.",
	},
	{
		id: "I18N01",
		pillar: "i18n",
		criterion:
			"Controlled locale matrix for Afenda-Lite product shells is English-only (html lang=en)",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: ["apps/web/app/layout.tsx"],
		notes:
			"Locale-free routes (/fft, /admin, /client); next-intl product source absent by design for this claim scope.",
	},
	{
		id: "I18N02",
		pillar: "i18n",
		criterion:
			"Multi-locale product UI (next-intl · messages catalogs · locale URL segments)",
		owner: "Feed Farm Trade",
		evidenceState: "NOT_APPLICABLE",
		evidencePaths: [],
		notes:
			"Owning rationale: ARCH-012 / ARCH-031 — locale URL tree rejected; FFT routes locale-free; multi-locale deferred until program reopen + Living owner adopts matrix. Fail-closed: no locale switcher / FftShell restore.",
	},
	{
		id: "PERF01",
		pillar: "perf",
		criterion:
			"Frontend Core Web Vitals lab budgets (LCP/INP/CLS) with workload · env · percentile · regression trigger",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: [
			"testing/fe-cwv-budgets.ts",
			"testing/e2e/cwv.ts",
			"e2e/smoke/fe-cwv-budgets.spec.ts",
		],
		notes:
			"Adopted Google CWV “good” thresholds (not invented) in FE_CWV_BUDGETS; lab smoke asserts public /auth/login · /403. Multi-tenant capacity/saturation NOT APPLICABLE until I6 load harness (owning rationale).",
	},
	{
		id: "PERF02",
		pillar: "perf",
		criterion:
			"Neon DB performance posture remains separately owned (N4) — not a frontend CWV substitute",
		owner: "Platform",
		evidenceState: "PASS",
		evidencePaths: ["docs/runbooks/RB-001-multi-org-ops.md"],
		notes:
			"References Neon Auth N4 / RB-001 pooler + SELECT-1 discipline only; does not claim FE budgets.",
	},
] as const satisfies readonly UxCriteriaRow[];

export type UxCriteriaId = (typeof UX_A11Y_I18N_PERF_MATRIX)[number]["id"];
