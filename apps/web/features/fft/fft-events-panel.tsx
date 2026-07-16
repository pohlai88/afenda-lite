"use client";

import {
	DataTable,
	type DataTableColumn,
} from "@afenda/ui-system";

export type FftEventRow = {
	id: string;
	eventName: string;
	eventCode: string;
	status: string;
};

const columns: DataTableColumn<FftEventRow>[] = [
	{ key: "eventName", title: "Event" },
	{
		key: "eventCode",
		title: "Code",
		render: (value) => (
			<code className="font-mono text-sm text-foreground-tertiary">
				{String(value)}
			</code>
		),
	},
	{ key: "status", title: "Status" },
];

type FftEventsPanelProps = {
	events: FftEventRow[];
};

export function FftEventsPanel({ events }: FftEventsPanelProps) {
	return (
		<DataTable
			columns={columns}
			data={events}
			getRowId={(row) => row.id}
			emptyTitle="No events yet"
			emptyDescription="Events appear here when the org records FFT activity."
			density="comfortable"
		/>
	);
}
