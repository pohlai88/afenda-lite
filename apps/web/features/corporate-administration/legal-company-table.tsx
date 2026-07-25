"use client";

import {
	Button,
	Code,
	DataTable,
	type DataTableColumn,
	StatusBadge,
} from "@afenda/ui-system";
import Link from "next/link";

export type LegalCompanyTableRow = Record<string, unknown> & {
	id: string;
	code: string;
	legalEntityName: string;
	status: "draft" | "active" | "suspended" | "dissolved" | "archived";
	version: number;
	updatedAt: string;
};

const statusTone = {
	draft: "pending",
	active: "success",
	suspended: "warning",
	dissolved: "error",
	archived: "inactive",
} as const;

const columns: DataTableColumn<LegalCompanyTableRow>[] = [
	{
		key: "code",
		title: "Company code",
		sortable: true,
		render: (value) => <Code>{String(value)}</Code>,
	},
	{ key: "legalEntityName", title: "Legal entity" },
	{
		key: "status",
		title: "Status",
		render: (value, row) => (
			<StatusBadge status={statusTone[row.status]} label={String(value)} />
		),
	},
	{ key: "version", title: "Version" },
	{ key: "updatedAt", title: "Updated" },
	{
		key: "id",
		title: "Open",
		render: (_value, row) => (
			<Button asChild size="sm" variant="outline">
				<Link href={`?companyId=${encodeURIComponent(row.id)}`}>
					Open {row.code}
				</Link>
			</Button>
		),
	},
];

export function LegalCompanyTable({ rows }: { rows: LegalCompanyTableRow[] }) {
	return (
		<DataTable
			columns={columns}
			data={rows}
			getRowId={(row) => row.id}
			emptyTitle="No legal companies yet"
			emptyDescription="Create a draft company to begin the statutory registry."
			density="comfortable"
		/>
	);
}
