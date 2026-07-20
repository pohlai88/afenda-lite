"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

export type PaymentTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	direction: string;
	status: string;
	version: number;
	currencyCode: string;
	amount: string;
	allocationCount: number;
};

const columns: DataTableColumn<PaymentTableRow>[] = [
	{ key: "code", title: "Code" },
	{ key: "direction", title: "Direction" },
	{ key: "status", title: "Status" },
	{ key: "version", title: "Version" },
	{
		key: "id",
		title: "Payment id",
		render: (value) => <Code>{String(value)}</Code>,
	},
	{
		key: "amount",
		title: "Amount",
		render: (value, row) => `${row.currencyCode} ${String(value)}`,
	},
	{ key: "allocationCount", title: "Allocations" },
];

export function PaymentsTable({ rows }: { rows: PaymentTableRow[] }) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			getRowId={(row) => row.id}
			emptyTitle="No payments yet"
			emptyDescription="Create a draft payment to begin the payment register."
			density="comfortable"
		/>
	);
}
