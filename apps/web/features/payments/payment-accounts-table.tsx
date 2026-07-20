"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

export type PaymentAccountTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	name: string;
	kind: string;
	currencyCode: string;
	active: boolean;
};

const columns: DataTableColumn<PaymentAccountTableRow>[] = [
	{ key: "code", title: "Code" },
	{ key: "name", title: "Name" },
	{ key: "kind", title: "Kind" },
	{ key: "currencyCode", title: "Currency" },
	{
		key: "active",
		title: "Active",
		render: (value) => (value === true ? "yes" : "no"),
	},
	{
		key: "id",
		title: "Account id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

export function PaymentAccountsTable({
	rows,
}: {
	rows: PaymentAccountTableRow[];
}) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			getRowId={(row) => row.id}
			emptyTitle="No payment accounts yet"
			emptyDescription="Create a payment account to hold receipts and disbursements."
			density="comfortable"
		/>
	);
}
