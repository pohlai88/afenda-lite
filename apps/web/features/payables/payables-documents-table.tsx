// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

import { CollectionRetryAction } from "@/features/shared/collection-retry-action";

export type PayablesDocumentTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	documentType: string;
	status: string;
	version: number;
	supplier: string;
	currencyCode: string;
	openAmount: string;
	lineCount: number;
};

const columns: DataTableColumn<PayablesDocumentTableRow>[] = [
	{ key: "code", title: "Document", width: "9rem" },
	{ key: "status", title: "Status" },
	{ key: "documentType", title: "Type" },
	{ key: "supplier", title: "Supplier" },
	{
		key: "openAmount",
		title: "Open amount",
		render: (value, row) => `${row.currencyCode} ${String(value)}`,
	},
	{ key: "lineCount", title: "Lines" },
	{ key: "version", title: "Version" },
	{
		key: "id",
		title: "Document id",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

interface PayablesDocumentsTableProps {
	error: string | undefined;
	rows: PayablesDocumentTableRow[];
}

export function PayablesDocumentsTable({
	error,
	rows,
}: PayablesDocumentsTableProps) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			density="comfortable"
			emptyDescription="Create a supplier invoice or credit note to begin the payables register."
			emptyTitle="No payables documents yet"
			{...(error
				? {
						error: {
							title: "Could not load supplier documents",
							description: error,
							action: <CollectionRetryAction label="Retry loading documents" />,
						},
					}
				: {})}
			getRowId={(row) => row.id}
			pinnedColumns={{ left: ["code"] }}
		/>
	);
}
