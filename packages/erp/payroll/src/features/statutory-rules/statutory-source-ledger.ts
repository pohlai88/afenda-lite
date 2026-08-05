/**
 * A2 authoritative-source ledger for in-house MY/VN statutory calculators.
 * Rates live in effective-dated rule-pack config reviewed against these sources;
 * this module owns citations and instrument→calculator mapping, not gazetted numbers.
 */

export const PAYROLL_STATUTORY_SOURCE_LEDGER = [
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
	},
] as const;

export type PayrollStatutorySourceLedgerEntry =
	(typeof PAYROLL_STATUTORY_SOURCE_LEDGER)[number];

export function listStatutorySourceLedger(): readonly PayrollStatutorySourceLedgerEntry[] {
	return PAYROLL_STATUTORY_SOURCE_LEDGER;
}
