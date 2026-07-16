"use client";

import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	DataTable,
	type DataTableColumn,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	KeyValueList,
	StatusBadge,
} from "@afenda/ui-system";
import * as React from "react";

export type OrgRoleRow = {
	id: string;
	name: string;
	active: boolean;
};

export type OrgAssignmentRow = {
	id: string;
	userId: string;
	roleId: string;
	scopeType: string;
};

export type OrgAuditRow = {
	id: string;
	action: string;
	targetType: string | null;
};

type OrgAdminPanelsProps = {
	roles: OrgRoleRow[];
	assignments: OrgAssignmentRow[];
	auditRows: OrgAuditRow[];
};

const roleColumns: DataTableColumn<OrgRoleRow>[] = [
	{ key: "name", title: "Role", sortable: true },
	{
		key: "active",
		title: "Status",
		render: (value) => (
			<StatusBadge
				status={value ? "active" : "inactive"}
				label={value ? "Active" : "Inactive"}
			/>
		),
	},
	{ key: "id", title: "ID" },
];

const assignmentColumns: DataTableColumn<OrgAssignmentRow>[] = [
	{ key: "userId", title: "User" },
	{ key: "roleId", title: "Role ID" },
	{ key: "scopeType", title: "Scope" },
];

const auditColumns: DataTableColumn<OrgAuditRow>[] = [
	{ key: "action", title: "Action" },
	{
		key: "targetType",
		title: "Target",
		render: (value) => (value ? String(value) : "—"),
	},
];

export function OrgAdminPanels({
	roles,
	assignments,
	auditRows,
}: OrgAdminPanelsProps) {
	const [sortBy, setSortBy] = React.useState<keyof OrgRoleRow>("name");
	const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
		"asc",
	);
	const [selectedAudit, setSelectedAudit] = React.useState<OrgAuditRow | null>(
		null,
	);

	const sortedRoles = React.useMemo(() => {
		const copy = [...roles];
		copy.sort((a, b) => {
			const left = String(a[sortBy] ?? "");
			const right = String(b[sortBy] ?? "");
			const cmp = left.localeCompare(right);
			return sortDirection === "asc" ? cmp : -cmp;
		});
		return copy;
	}, [roles, sortBy, sortDirection]);

	return (
		<div className="flex flex-col gap-(--section-gap)">
			<Card>
				<CardHeader>
					<CardTitle>Roles</CardTitle>
					<CardDescription>
						Org-scoped membership roles ({roles.length}).
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={roleColumns}
						data={sortedRoles}
						getRowId={(row) => row.id}
						sortBy={sortBy}
						sortDirection={sortDirection}
						onSort={(key, direction) => {
							setSortBy(key);
							setSortDirection(direction);
						}}
						emptyTitle="No org roles yet"
						emptyDescription="Roles appear here after platform seeding."
						density="comfortable"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Role assignments</CardTitle>
					<CardDescription>
						Active assignments for this organization ({assignments.length}).
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={assignmentColumns}
						data={assignments}
						getRowId={(row) => row.id}
						emptyTitle="No role assignments yet"
						emptyDescription="Invite a member to create the first assignment."
						density="compact"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div className="space-y-1.5">
						<CardTitle>RBAC audit</CardTitle>
						<CardDescription>
							Recent org-scoped audit events ({auditRows.length}).
						</CardDescription>
					</div>
					<Badge variant="secondary">{auditRows.length} events</Badge>
				</CardHeader>
				<CardContent className="space-y-3">
					<DataTable
						columns={auditColumns}
						data={auditRows}
						getRowId={(row) => row.id}
						emptyTitle="No audit rows yet"
						emptyDescription="Invites and role changes write audit entries here."
						density="compact"
						rowActions={(row) => (
							<Dialog
								open={selectedAudit?.id === row.id}
								onOpenChange={(open) => setSelectedAudit(open ? row : null)}
							>
								<DialogTrigger asChild>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setSelectedAudit(row)}
									>
										View
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Audit event</DialogTitle>
										<DialogDescription>
											Org-scoped RBAC audit detail.
										</DialogDescription>
									</DialogHeader>
									<KeyValueList
										size="sm"
										items={[
											{ label: "Action", value: row.action },
											{
												label: "Target",
												value: row.targetType ?? "—",
											},
											{
												label: "Event ID",
												value: (
													<code className="font-mono text-sm">{row.id}</code>
												),
											},
										]}
									/>
								</DialogContent>
							</Dialog>
						)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
