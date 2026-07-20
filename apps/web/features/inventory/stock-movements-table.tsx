"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";
import Link from "next/link";

export type StockMovementTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	movementType: string;
	source: string;
	status: string;
	version: number;
	lineCount: number;
	warehouseLabel: string;
};

function buildColumns(
	detailHrefBase: string,
): DataTableColumn<StockMovementTableRow>[] {
	return [
		{
			key: "code",
			title: "Code",
			render: (value, row) => (
				<Link
					href={`${detailHrefBase}?movementId=${encodeURIComponent(row.id)}`}
					className="font-medium underline-offset-4 hover:underline"
				>
					{String(value)}
				</Link>
			),
		},
		{ key: "movementType", title: "Type" },
		{ key: "source", title: "Source" },
		{ key: "status", title: "Status" },
		{ key: "version", title: "Version" },
		{ key: "lineCount", title: "Lines" },
		{ key: "warehouseLabel", title: "Warehouse" },
		{
			key: "id",
			title: "Movement id",
			render: (value) => <Code>{String(value)}</Code>,
		},
	];
}

export function StockMovementsTable({
	rows,
	detailHrefBase,
}: {
	rows: StockMovementTableRow[];
	detailHrefBase: string;
}) {
	return (
		<DataTable
			columns={buildColumns(detailHrefBase)}
			data={rows}
			getRowId={(row) => row.id}
			emptyTitle="No stock movements yet"
			emptyDescription="Create a draft opening-balance receipt, transfer, or adjustment to begin."
			density="comfortable"
		/>
	);
}
