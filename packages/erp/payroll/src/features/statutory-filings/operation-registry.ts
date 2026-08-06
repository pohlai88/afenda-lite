import {
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVIEW,
} from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "statutory-filings" as const;

export const PAYROLL_STATUTORY_FILING_COMMANDS = definePayrollOperationRegistry(
	{
		generateStatutoryFiling: {
			id: "payroll.statutory-filing.generate",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RUN_REVIEW,
			publicName: "generateStatutoryFiling",
		},
		generateAnnualStatement: {
			id: "payroll.statutory-filing.annual.generate",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RUN_REVIEW,
			publicName: "generateAnnualStatement",
		},
		sealFilingEvidence: {
			id: "payroll.statutory-filing.evidence.seal",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RUN_FINALIZE,
			publicName: "sealFilingEvidence",
		},
	},
);

export const PAYROLL_STATUTORY_FILING_QUERIES = definePayrollOperationRegistry({
	listFilingObligations: {
		id: "payroll.statutory-filing.obligation.list",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVIEW,
		publicName: "listFilingObligations",
	},
});
