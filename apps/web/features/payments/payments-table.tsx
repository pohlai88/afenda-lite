// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
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
	purpose: string;
	instructionCount: number;
};

const columns: DataTableColumn<PaymentTableRow>[] = [
	{ key: "code", title: "Code" },
	{ key: "direction", title: "Direction" },
	{ key: "purpose", title: "Purpose" },
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
	{ key: "instructionCount", title: "Instructions" },
];

export function PaymentsTable({ rows }: { rows: PaymentTableRow[] }) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			density="comfortable"
			emptyDescription="Create a draft payment to begin the payment register."
			emptyTitle="No payments yet"
			getRowId={(row) => row.id}
		/>
	);
}
