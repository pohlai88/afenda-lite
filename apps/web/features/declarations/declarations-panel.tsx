"use client";

import {
	DataTable,
	type DataTableColumn,
} from "@afenda/ui-system";

export type DeclarationSurveyRow = {
	id: string;
	title: string;
	slug: string;
};

const columns: DataTableColumn<DeclarationSurveyRow>[] = [
	{ key: "title", title: "Survey" },
	{
		key: "slug",
		title: "Slug",
		render: (value) => (
			<code className="font-mono text-sm text-muted-foreground">
				{String(value)}
			</code>
		),
	},
];

type DeclarationsPanelProps = {
	surveys: DeclarationSurveyRow[];
};

export function DeclarationsPanel({ surveys }: DeclarationsPanelProps) {
	return (
		<DataTable
			columns={columns}
			data={surveys}
			getRowId={(row) => row.id}
			emptyTitle="No surveys yet"
			emptyDescription="Surveys appear here when declarations are published for this org."
			density="comfortable"
		/>
	);
}
