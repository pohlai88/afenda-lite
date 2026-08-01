// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

import { CollectionRetryAction } from "@/features/shared/collection-retry-action";

export type ReceivingExceptionTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	inventoryStatus: string;
	errorMessage: string;
};

export type GoodsReceiptTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	status: string;
	version: number;
	source: string;
	warehouse: string;
	lineCount: number;
	discrepancyCount: number;
	inventoryStatus: string;
	relation: string;
};

const exceptionColumns: DataTableColumn<ReceivingExceptionTableRow>[] = [
	{ key: "code", title: "Receipt", width: "9rem" },
	{ key: "inventoryStatus", title: "Inventory status" },
	{ key: "errorMessage", title: "Application detail" },
	{
		key: "id",
		title: "Receipt id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

const receiptColumns: DataTableColumn<GoodsReceiptTableRow>[] = [
	{ key: "code", title: "Receipt", width: "9rem" },
	{ key: "status", title: "Status" },
	{ key: "inventoryStatus", title: "Inventory status" },
	{ key: "source", title: "Source" },
	{ key: "warehouse", title: "Warehouse" },
	{ key: "lineCount", title: "Lines" },
	{ key: "discrepancyCount", title: "Discrepancies" },
	{ key: "relation", title: "Reversal relation" },
	{ key: "version", title: "Version" },
	{
		key: "id",
		title: "Receipt id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

export function ReceivingExceptionsTable({
	error,
	rows,
}: {
	error: string | undefined;
	rows: ReceivingExceptionTableRow[];
}) {
	return (
		<DataTable
			columns={exceptionColumns}
			data={rows}
			density="comfortable"
			emptyDescription="No posted receipts currently require inventory application review."
			emptyTitle="No inventory exceptions"
			{...(error
				? {
						error: {
							title: "Could not load inventory exceptions",
							description: error,
							action: (
								<CollectionRetryAction label="Retry loading exceptions" />
							),
						},
					}
				: {})}
			getRowId={(row) => row.id}
			pinnedColumns={{ left: ["code"] }}
		/>
	);
}

interface GoodsReceiptsTableProps {
	error: string | undefined;
	rows: GoodsReceiptTableRow[];
}

export function GoodsReceiptsTable({ error, rows }: GoodsReceiptsTableProps) {
	return (
		<DataTable
			columns={receiptColumns}
			data={rows}
			density="comfortable"
			emptyDescription="Create a draft goods receipt to begin the receiving register."
			emptyTitle="No goods receipts yet"
			{...(error
				? {
						error: {
							title: "Could not load goods receipts",
							description: error,
							action: <CollectionRetryAction label="Retry loading receipts" />,
						},
					}
				: {})}
			getRowId={(row) => row.id}
			pinnedColumns={{ left: ["code"] }}
		/>
	);
}
