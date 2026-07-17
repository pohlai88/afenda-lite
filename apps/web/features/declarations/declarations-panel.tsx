"use client";

import {
	Badge,
	Button,
	Code,
	DataTable,
	type DataTableColumn,
	FormField,
	Input,
	StatusBadge,
} from "@afenda/ui-system";
import Link from "next/link";
import * as React from "react";

import { DeclarationDraftSheet } from "@/features/declarations/declaration-draft-sheet";

export type DeclarationDueState = "open" | "past_due" | "none";

export type DeclarationAssignmentRow = {
	assignmentId: string;
	surveyId: string;
	title: string;
	slug: string;
	question: string;
	referenceNumber: string | null;
	caseNumber: string | null;
	effectiveDate: string | null;
	submitBefore: string | null;
	dueState: DeclarationDueState;
	assignmentStatus: string;
	draftSavedAt: string | null;
	surveyorName: string | null;
	surveyorOrg: string | null;
	surveyeeOrg: string | null;
	purpose: string | null;
	categories: string[];
	createdAt: string;
};

type DeclarationsPanelProps = {
	assignments: DeclarationAssignmentRow[];
	canEditDraft: boolean;
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

function matchesFilter(row: DeclarationAssignmentRow, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (needle.length === 0) {
		return true;
	}
	const haystack = [row.title, row.slug, row.referenceNumber ?? ""]
		.join(" ")
		.toLowerCase();
	return haystack.includes(needle);
}

function isSubmittedStatus(status: string): boolean {
	return status.trim().toLowerCase() === "submitted";
}

const columns: DataTableColumn<DeclarationAssignmentRow>[] = [
	{ key: "title", title: "Survey", sortable: true },
	{
		key: "slug",
		title: "Slug",
		sortable: true,
		render: (value) => <Code>{String(value)}</Code>,
	},
	{
		key: "assignmentStatus",
		title: "Assignment",
		sortable: true,
		render: (value) => {
			const status = String(value);
			return (
				<Badge variant={isSubmittedStatus(status) ? "default" : "secondary"}>
					{status}
				</Badge>
			);
		},
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
		key: "draftSavedAt",
		title: "Draft",
		sortable: true,
		render: (value) =>
			value ? (
				formatDate(String(value))
			) : (
				<span className="text-foreground-tertiary">Not started</span>
			),
	},
];

export function DeclarationsPanel({
	assignments,
	canEditDraft,
}: DeclarationsPanelProps) {
	const [sortBy, setSortBy] =
		React.useState<keyof DeclarationAssignmentRow>("title");
	const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
		"asc",
	);
	const [draftTarget, setDraftTarget] =
		React.useState<DeclarationAssignmentRow | null>(null);
	const [filterQuery, setFilterQuery] = React.useState("");
	const filterFieldId = React.useId();

	const filtered = React.useMemo(
		() => assignments.filter((row) => matchesFilter(row, filterQuery)),
		[assignments, filterQuery],
	);

	const sorted = React.useMemo(() => {
		const copy = [...filtered];
		copy.sort((a, b) => {
			const left = a[sortBy];
			const right = b[sortBy];
			if (sortBy === "submitBefore" || sortBy === "draftSavedAt") {
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
	}, [filtered, sortBy, sortDirection]);

	return (
		<div className="flex flex-col gap-3">
			<FormField
				label="Filter assignments"
				description="Match title, slug, or reference."
				fieldId={filterFieldId}
				className="w-full max-w-sm"
			>
				<Input
					id={filterFieldId}
					value={filterQuery}
					onChange={(event) => setFilterQuery(event.target.value)}
					placeholder="Title, slug, or reference"
				/>
			</FormField>

			<DataTable
				columns={columns}
				data={sorted}
				getRowId={(row) => row.assignmentId}
				sortBy={sortBy}
				sortDirection={sortDirection}
				onSort={(key, direction) => {
					setSortBy(key);
					setSortDirection(direction);
				}}
				emptyTitle={
					filterQuery.trim().length > 0
						? "No matching assignments"
						: "No assignments yet"
				}
				emptyDescription={
					filterQuery.trim().length > 0
						? "Try a different title, slug, or reference."
						: "Assignments appear here when a survey is assigned to your client email."
				}
				density="comfortable"
				rowActions={(row) => {
					const submitted = isSubmittedStatus(row.assignmentStatus);
					return (
						<div className="flex flex-wrap gap-2">
							<Button asChild variant="outline" size="sm">
								<Link href={`/client/declarations/${row.assignmentId}`}>
									View
								</Link>
							</Button>
							{canEditDraft && !submitted ? (
								<Button
									type="button"
									size="sm"
									onClick={() => setDraftTarget(row)}
								>
									Respond
								</Button>
							) : null}
						</div>
					);
				}}
			/>

			{draftTarget ? (
				<DeclarationDraftSheet
					open
					onOpenChange={(open) => {
						if (!open) {
							setDraftTarget(null);
						}
					}}
					assignmentId={draftTarget.assignmentId}
					surveyId={draftTarget.surveyId}
					title={draftTarget.title}
					question={draftTarget.question}
				/>
			) : null}
		</div>
	);
}
