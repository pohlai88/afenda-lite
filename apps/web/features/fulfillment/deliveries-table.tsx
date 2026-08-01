// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

import { CollectionRetryAction } from "@/features/shared/collection-retry-action";

export type DeliveryTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	status: string;
	version: number;
	warehouse: string;
	lineCount: number;
	pickCount: number;
	packCount: number;
	proofOfDelivery: string;
};

const columns: DataTableColumn<DeliveryTableRow>[] = [
	{ key: "code", title: "Delivery", width: "9rem" },
	{ key: "status", title: "Status" },
	{ key: "warehouse", title: "Warehouse" },
	{ key: "lineCount", title: "Lines" },
	{ key: "pickCount", title: "Picks" },
	{ key: "packCount", title: "Packs" },
	{ key: "proofOfDelivery", title: "Proof of delivery" },
	{ key: "version", title: "Version" },
	{
		key: "id",
		title: "Delivery id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

interface DeliveriesTableProps {
	error: string | undefined;
	rows: DeliveryTableRow[];
}

export function DeliveriesTable({ error, rows }: DeliveriesTableProps) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			density="comfortable"
			emptyDescription="Create a draft delivery to begin the delivery register."
			emptyTitle="No deliveries yet"
			{...(error
				? {
						error: {
							title: "Could not load deliveries",
							description: error,
							action: (
								<CollectionRetryAction label="Retry loading deliveries" />
							),
						},
					}
				: {})}
			getRowId={(row) => row.id}
			pinnedColumns={{ left: ["code"] }}
		/>
	);
}
