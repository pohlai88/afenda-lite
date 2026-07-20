"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

export type JournalTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	periodId: string;
	status: string;
	version: number;
	currencyCode: string;
	lineCount: number;
};

export type TrialBalanceTableRow = Record<string, unknown> & {
	accountCode: string;
	totalDebit: string;
	totalCredit: string;
	balance: string;
};

const journalColumns: DataTableColumn<JournalTableRow>[] = [
	{ key: "code", title: "Code" },
	{ key: "status", title: "Status" },
	{ key: "version", title: "Version" },
	{ key: "currencyCode", title: "Currency" },
	{ key: "lineCount", title: "Lines" },
	{
		key: "periodId",
		title: "Period id",
		render: (value) => <Code>{String(value)}</Code>,
	},
	{
		key: "id",
		title: "Journal id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

const trialBalanceColumns: DataTableColumn<TrialBalanceTableRow>[] = [
	{ key: "accountCode", title: "Account" },
	{ key: "totalDebit", title: "Debit" },
	{ key: "totalCredit", title: "Credit" },
	{ key: "balance", title: "Balance" },
];

export function JournalsTable({ rows }: { rows: JournalTableRow[] }) {
	return (
		<DataTable
			columns={journalColumns}
			data={rows}
			getRowId={(row) => row.id}
			emptyTitle="No journals yet"
			emptyDescription="Open a period and create a draft journal to begin."
			density="comfortable"
		/>
	);
}

export function TrialBalanceTable({ rows }: { rows: TrialBalanceTableRow[] }) {
	return (
		<DataTable
			columns={trialBalanceColumns}
			data={rows}
			getRowId={(row) => row.accountCode}
			emptyTitle="No posted balances"
			emptyDescription="Posted journal lines will appear in the trial balance."
			density="comfortable"
		/>
	);
}
