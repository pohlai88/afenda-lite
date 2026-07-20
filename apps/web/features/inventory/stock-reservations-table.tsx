"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

export type StockReservationTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	status: string;
	warehouseCode: string;
	itemCode: string;
	quantity: string;
	consumedQuantity: string;
	version: number;
};

const columns: DataTableColumn<StockReservationTableRow>[] = [
	{ key: "code", title: "Code" },
	{ key: "status", title: "Status" },
	{ key: "warehouseCode", title: "Warehouse" },
	{ key: "itemCode", title: "Item" },
	{ key: "quantity", title: "Quantity" },
	{ key: "consumedQuantity", title: "Consumed" },
	{ key: "version", title: "Version" },
	{
		key: "id",
		title: "Reservation id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

export function StockReservationsTable({
	rows,
}: {
	rows: StockReservationTableRow[];
}) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			getRowId={(row) => row.id}
			emptyTitle="No stock reservations yet"
			emptyDescription="Reserve available quantity against a warehouse and item."
			density="comfortable"
		/>
	);
}
