// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { Code, DataTable, type DataTableColumn } from "@afenda/ui-system";

import { CollectionRetryAction } from "@/features/shared/collection-retry-action";

export type ReceivablesDocumentTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	invoiceSource: string;
	status: string;
	version: number;
	customer: string;
	currencyCode: string;
	openAmount: string;
	lineCount: number;
};

const columns: DataTableColumn<ReceivablesDocumentTableRow>[] = [
	{ key: "code", title: "Document", width: "9rem" },
	{ key: "status", title: "Status" },
	{ key: "invoiceSource", title: "Source" },
	{ key: "customer", title: "Customer" },
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

interface ReceivablesDocumentsTableProps {
	error: string | undefined;
	rows: ReceivablesDocumentTableRow[];
}

export function ReceivablesDocumentsTable({
	error,
	rows,
}: ReceivablesDocumentsTableProps) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			density="comfortable"
			emptyDescription="Create a sales invoice or credit note to begin the receivables register."
			emptyTitle="No receivables documents yet"
			{...(error
				? {
						error: {
							title: "Could not load customer documents",
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
