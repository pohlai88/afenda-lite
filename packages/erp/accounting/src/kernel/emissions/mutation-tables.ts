/** Aggregates and mutation tables owned by @afenda/accounting. */
export const ACCOUNTING_AGGREGATES = [
	"journal",
	"accounting_period",
	"chart_of_account",
	"ledger_account",
	"account_role_mapping",
	"posting_profile",
	"source_posting_link",
	"financial_posting_exception",
] as const;

export const ACCOUNTING_MUTATION_TABLES = [
	"journal",
	"journal_line",
	"ledger_posting",
	"accounting_period",
	"chart_of_account",
	"ledger_account",
	"account_role_mapping",
	"posting_profile",
	"posting_profile_line",
	"source_posting_link",
	"financial_posting_exception",
] as const;
