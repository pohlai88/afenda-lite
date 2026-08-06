/**
 * A2 authoritative-source ledger for in-house MY/VN statutory calculators.
 * Rates live in effective-dated rule-pack config reviewed against these sources;
 * this module owns citations and instrument→calculator mapping, not gazetted numbers.
 */

/**
 * A provenance field only a human pack reviewer can honestly fill in.
 *
 * The engineering commit cannot assert which gazette revision was read, on what
 * date, or from when it applies — asserting it would be a fabricated citation.
 * `pending_review` is therefore a first-class state rather than a null or a
 * TODO: it is visible in the type, survives serialization, and lets a readiness
 * check ask "which ledger rows are still unattested" without string matching.
 */
export type StatutorySourceAttestation<T> =
	| { readonly state: "pending_review" }
	| { readonly state: "recorded"; readonly value: T };

const PENDING = { state: "pending_review" } as const;

interface StatutorySourceLedgerRow {
	readonly authority: string;
	readonly calculatorId: string;
	readonly citations: readonly string[];
	/** Publisher's own revision/version marker for the cited document. */
	readonly documentVersion: StatutorySourceAttestation<string>;
	/** First date the cited instrument's amounts apply from. */
	readonly effectiveFrom: StatutorySourceAttestation<string>;
	/** Last date they apply to; `null` once recorded means "still in force". */
	readonly effectiveTo: StatutorySourceAttestation<string | null>;
	readonly instrumentCode: string;
	readonly jurisdictionCode: string;
	readonly requirementIds: readonly string[];
	/** When the reviewer actually retrieved the cited document. */
	readonly retrievedAt: StatutorySourceAttestation<string>;
}

export const PAYROLL_STATUTORY_SOURCE_LEDGER: readonly StatutorySourceLedgerRow[] =
	[
		{
			jurisdictionCode: "MY",
			instrumentCode: "EPF",
			calculatorId: "my.epf.v1",
			authority: "KWSP contribution schedule (incl. Oct 2025 category changes)",
			citations: [
				"https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution",
				"https://www.kwsp.gov.my/en/employer/responsibilities/non-malaysian-citizen-employees",
			],
			requirementIds: ["PAY-MY-001", "PAY-MY-006"],
			effectiveFrom: PENDING,
			effectiveTo: PENDING,
			documentVersion: PENDING,
			retrievedAt: PENDING,
		},
		{
			jurisdictionCode: "MY",
			instrumentCode: "SOCSO",
			calculatorId: "my.socso.v1",
			authority: "PERKESO contribution rates and categories",
			citations: [
				"https://www.perkeso.gov.my/en/rate-of-contribution.html",
				"https://www.perkeso.gov.my/en/uncategorised/778-contributions.html",
			],
			requirementIds: ["PAY-MY-002"],
			effectiveFrom: PENDING,
			effectiveTo: PENDING,
			documentVersion: PENDING,
			retrievedAt: PENDING,
		},
		{
			jurisdictionCode: "MY",
			instrumentCode: "EIS",
			calculatorId: "my.eis.v1",
			authority: "PERKESO EIS contribution configuration",
			citations: [
				"https://www.perkeso.gov.my/en/rate-of-contribution.html",
				"https://www.perkeso.gov.my/en/uncategorised/778-contributions.html",
			],
			requirementIds: ["PAY-MY-003"],
			effectiveFrom: PENDING,
			effectiveTo: PENDING,
			documentVersion: PENDING,
			retrievedAt: PENDING,
		},
		{
			jurisdictionCode: "MY",
			instrumentCode: "PCB",
			calculatorId: "my.pcb.v1",
			authority: "LHDN / HASiL PCB calculation and remittance workflows",
			citations: [
				"https://www.hasil.gov.my/en/e-services/",
				"https://www.hasil.gov.my/majikan/pembayaran-pcb/",
				"https://www.hasil.gov.my/media/aeacr5pp/bi-tp3-form-2026.pdf",
			],
			requirementIds: ["PAY-MY-004", "PAY-MY-005"],
			effectiveFrom: PENDING,
			effectiveTo: PENDING,
			documentVersion: PENDING,
			retrievedAt: PENDING,
		},
		{
			jurisdictionCode: "VN",
			instrumentCode: "SI",
			calculatorId: "vn.si.v1",
			authority: "Social Insurance Law 41/2024/QH15 + Decree 158/2025/ND-CP",
			citations: [
				"https://vanban.chinhphu.vn/?classid=1&docid=211199&orggroupid=1&pageid=27160",
				"https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-158-2025-nd-cp-quy-dinh-ve-bao-hiem-xa-hoi-bat-buoc-119250629171336803.htm",
			],
			requirementIds: ["PAY-VN-001", "PAY-VN-008"],
			effectiveFrom: PENDING,
			effectiveTo: PENDING,
			documentVersion: PENDING,
			retrievedAt: PENDING,
		},
		{
			jurisdictionCode: "VN",
			instrumentCode: "HI",
			calculatorId: "vn.hi.v1",
			authority: "Vietnam mandatory health insurance contribution baseline",
			citations: [
				"https://vanban.chinhphu.vn/?classid=1&docid=211199&orggroupid=1&pageid=27160",
			],
			requirementIds: ["PAY-VN-002"],
			effectiveFrom: PENDING,
			effectiveTo: PENDING,
			documentVersion: PENDING,
			retrievedAt: PENDING,
		},
		{
			jurisdictionCode: "VN",
			instrumentCode: "UI",
			calculatorId: "vn.ui.v1",
			authority: "Vietnam unemployment insurance contribution baseline",
			citations: [
				"https://vanban.chinhphu.vn/?classid=1&docid=211199&orggroupid=1&pageid=27160",
			],
			requirementIds: ["PAY-VN-002"],
			effectiveFrom: PENDING,
			effectiveTo: PENDING,
			documentVersion: PENDING,
			retrievedAt: PENDING,
		},
		{
			jurisdictionCode: "VN",
			instrumentCode: "PIT",
			calculatorId: "vn.pit.v1",
			authority: "Personal Income Tax Law 109/2025/QH15 (effective 1 Jul 2026)",
			citations: [
				"https://chinhphu.vn/?classid=1&docid=216495&pageid=27160&typegroupid=3",
				"https://xaydungchinhsach.chinhphu.vn/huong-dan-quyet-toan-thue-thu-nhap-ca-nhan-doi-voi-thu-nhap-tu-tien-luong-tien-cong-119260306092819051.htm",
			],
			requirementIds: ["PAY-VN-003", "PAY-VN-004"],
			effectiveFrom: PENDING,
			effectiveTo: PENDING,
			documentVersion: PENDING,
			retrievedAt: PENDING,
		},
	];

export type PayrollStatutorySourceLedgerEntry = StatutorySourceLedgerRow;

export function listStatutorySourceLedger(): readonly PayrollStatutorySourceLedgerEntry[] {
	return PAYROLL_STATUTORY_SOURCE_LEDGER;
}

/**
 * Ledger rows whose provenance a human reviewer has not yet attested. Empty is
 * the precondition for moving any pack off `awaiting_review`.
 */
export function listUnattestedStatutorySources(): readonly string[] {
	return PAYROLL_STATUTORY_SOURCE_LEDGER.filter((row) =>
		[
			row.effectiveFrom,
			row.effectiveTo,
			row.documentVersion,
			row.retrievedAt,
		].some((field) => field.state === "pending_review"),
	).map((row) => row.calculatorId);
}
