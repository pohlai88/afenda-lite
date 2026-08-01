// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

import { CollectionRetryAction } from "@/features/shared/collection-retry-action";

export type PurchaseOrderTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	status: string;
	version: number;
	supplier: string;
	currencyCode: string;
	documentTotal: string;
	paymentTerms: string;
	warehouse: string;
	lineCount: number;
};

const columns: DataTableColumn<PurchaseOrderTableRow>[] = [
	{ key: "code", title: "Order", width: "9rem" },
	{ key: "status", title: "Status" },
	{ key: "supplier", title: "Supplier" },
	{
		key: "documentTotal",
		title: "Total",
		render: (value, row) => `${row.currencyCode} ${String(value)}`,
	},
	{ key: "paymentTerms", title: "Payment terms" },
	{ key: "warehouse", title: "Warehouse" },
	{ key: "lineCount", title: "Lines" },
	{ key: "version", title: "Version" },
	{
		key: "id",
		title: "Order id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

interface PurchaseOrdersTableProps {
	error: string | undefined;
	rows: PurchaseOrderTableRow[];
}

export function PurchaseOrdersTable({ error, rows }: PurchaseOrdersTableProps) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			density="comfortable"
			emptyDescription="Create a draft purchase order to begin the order register."
			emptyTitle="No purchase orders yet"
			{...(error
				? {
						error: {
							title: "Could not load purchase orders",
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
