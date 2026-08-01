// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

import { CollectionRetryAction } from "@/features/shared/collection-retry-action";

export type SalesOrderTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	status: string;
	version: number;
	customer: string;
	currencyCode: string;
	documentTotal: string;
	paymentTerms: string;
};

const columns: DataTableColumn<SalesOrderTableRow>[] = [
	{ key: "code", title: "Order", width: "9rem" },
	{ key: "status", title: "Status" },
	{ key: "customer", title: "Customer" },
	{
		key: "documentTotal",
		title: "Total",
		render: (value, row) => `${row.currencyCode} ${String(value)}`,
	},
	{ key: "paymentTerms", title: "Payment terms" },
	{ key: "version", title: "Version" },
	{
		key: "id",
		title: "Order id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

interface SalesOrdersTableProps {
	error: string | undefined;
	rows: SalesOrderTableRow[];
}

export function SalesOrdersTable({ error, rows }: SalesOrdersTableProps) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			density="comfortable"
			emptyDescription="Create a draft sales order to begin the order register."
			emptyTitle="No sales orders yet"
			{...(error
				? {
						error: {
							title: "Could not load sales orders",
							description: error,
							action: <CollectionRetryAction label="Retry loading orders" />,
						},
					}
				: {})}
			getRowId={(row) => row.id}
			pinnedColumns={{ left: ["code"] }}
		/>
	);
}
