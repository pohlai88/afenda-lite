"use client";

import {
	Badge,
	Button,
	DataTable,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	KeyValueList,
	StatusBadge,
	type DataTableColumn,
} from "@afenda/ui-system";
import * as React from "react";

export type DeclarationDueState = "open" | "past_due" | "none";

export type DeclarationSurveyRow = {
	id: string;
	title: string;
	slug: string;
	question: string;
	referenceNumber: string | null;
	caseNumber: string | null;
	effectiveDate: string | null;
	submitBefore: string | null;
	dueState: DeclarationDueState;
	surveyorName: string | null;
	surveyorOrg: string | null;
	surveyeeOrg: string | null;
	purpose: string | null;
	categories: string[];
	createdAt: string;
};

type DeclarationsPanelProps = {
	surveys: DeclarationSurveyRow[];
};

function formatDate(value: string | null): string {
	if (!value) {
		return "—";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function dueBadge(dueState: DeclarationDueState): {
	status: "active" | "warning" | "inactive";
	label: string;
} {
	switch (dueState) {
		case "past_due":
			return { status: "warning", label: "Past due" };
		case "open":
			return { status: "active", label: "Open" };
		default:
			return { status: "inactive", label: "No due date" };
	}
}

const columns: DataTableColumn<DeclarationSurveyRow>[] = [
	{ key: "title", title: "Survey", sortable: true },
	{
		key: "slug",
		title: "Slug",
		sortable: true,
		render: (value) => (
			<code className="font-mono text-sm text-muted-foreground">
				{String(value)}
			</code>
		),
	},
	{
		key: "referenceNumber",
		title: "Reference",
		render: (value) => (value ? String(value) : "—"),
	},
	{
		key: "submitBefore",
		title: "Due",
		sortable: true,
		render: (value) => formatDate(value ? String(value) : null),
	},
	{
		key: "dueState",
		title: "Status",
		sortable: true,
		render: (value) => {
			const due = dueBadge(value as DeclarationDueState);
			return <StatusBadge status={due.status} label={due.label} />;
		},
	},
	{
		key: "categories",
		title: "Categories",
		render: (value) => {
			const categories = Array.isArray(value) ? value : [];
			if (categories.length === 0) {
				return <span className="text-muted-foreground">—</span>;
			}
			return (
				<div className="flex flex-wrap gap-1">
					{categories.slice(0, 2).map((category) => (
						<Badge key={category} variant="secondary">
							{category}
						</Badge>
					))}
					{categories.length > 2 ? (
						<Badge variant="outline">+{categories.length - 2}</Badge>
					) : null}
				</div>
			);
		},
	},
];

export function DeclarationsPanel({ surveys }: DeclarationsPanelProps) {
	const [sortBy, setSortBy] = React.useState<keyof DeclarationSurveyRow>("title");
	const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
		"asc",
	);
	const [selected, setSelected] = React.useState<DeclarationSurveyRow | null>(
		null,
	);

	const sortedSurveys = React.useMemo(() => {
		const copy = [...surveys];
		copy.sort((a, b) => {
			const left = a[sortBy];
			const right = b[sortBy];
			if (sortBy === "submitBefore") {
				const leftTime = left ? new Date(String(left)).getTime() : 0;
				const rightTime = right ? new Date(String(right)).getTime() : 0;
				const cmp = leftTime - rightTime;
				return sortDirection === "asc" ? cmp : -cmp;
			}
			const leftText = Array.isArray(left)
				? left.join(", ")
				: String(left ?? "");
			const rightText = Array.isArray(right)
				? right.join(", ")
				: String(right ?? "");
			const cmp = leftText.localeCompare(rightText);
			return sortDirection === "asc" ? cmp : -cmp;
		});
		return copy;
	}, [surveys, sortBy, sortDirection]);

	return (
		<DataTable
			columns={columns}
			data={sortedSurveys}
			getRowId={(row) => row.id}
			sortBy={sortBy}
			sortDirection={sortDirection}
			onSort={(key, direction) => {
				setSortBy(key);
				setSortDirection(direction);
			}}
			emptyTitle="No surveys yet"
			emptyDescription="Surveys appear here when declarations are published for this org."
			density="comfortable"
			rowActions={(row) => {
				const due = dueBadge(row.dueState);
				return (
					<Dialog
						open={selected?.id === row.id}
						onOpenChange={(open) => setSelected(open ? row : null)}
					>
						<DialogTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setSelected(row)}
							>
								View
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{row.title}</DialogTitle>
								<DialogDescription>
									Org-scoped declaration survey detail.
								</DialogDescription>
							</DialogHeader>
							<KeyValueList
								size="sm"
								items={[
									{
										label: "Slug",
										value: (
											<code className="font-mono text-sm">{row.slug}</code>
										),
									},
									{
										label: "Reference",
										value: row.referenceNumber ?? "—",
									},
									{
										label: "Case",
										value: row.caseNumber ?? "—",
									},
									{
										label: "Effective",
										value: formatDate(row.effectiveDate),
									},
									{
										label: "Due",
										value: formatDate(row.submitBefore),
									},
									{
										label: "Status",
										value: (
											<StatusBadge status={due.status} label={due.label} />
										),
									},
									{
										label: "Question",
										value: row.question,
									},
									{
										label: "Purpose",
										value: row.purpose ?? "—",
									},
									{
										label: "Surveyor",
										value:
											[row.surveyorName, row.surveyorOrg]
												.filter(Boolean)
												.join(" · ") || "—",
									},
									{
										label: "Surveyee org",
										value: row.surveyeeOrg ?? "—",
									},
									{
										label: "Categories",
										value:
											row.categories.length > 0
												? row.categories.join(", ")
												: "—",
									},
									{
										label: "Created",
										value: formatDate(row.createdAt),
									},
									{
										label: "Survey ID",
										value: (
											<code className="font-mono text-sm">{row.id}</code>
										),
									},
								]}
							/>
						</DialogContent>
					</Dialog>
				);
			}}
		/>
	);
}
