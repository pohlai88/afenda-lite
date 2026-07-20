"use client";

import { DataTable, type DataTableColumn } from "@afenda/ui-system";

export type StockAvailabilityTableRow = Record<string, unknown> & {
	id: string;
	warehouseCode: string;
	itemCode: string;
	onHandQuantity: string;
	reservedQuantity: string;
	availableQuantity: string;
};

const columns: DataTableColumn<StockAvailabilityTableRow>[] = [
	{ key: "warehouseCode", title: "Warehouse" },
	{ key: "itemCode", title: "Item" },
	{ key: "onHandQuantity", title: "On hand" },
	{ key: "reservedQuantity", title: "Reserved" },
	{ key: "availableQuantity", title: "Available" },
];

export function StockAvailabilityTable({
	rows,
}: {
	rows: StockAvailabilityTableRow[];
}) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			getRowId={(row) => row.id}
			emptyTitle="No stock balances yet"
			emptyDescription="Post a receipt or adjustment to project on-hand quantity."
			density="comfortable"
		/>
	);
}
