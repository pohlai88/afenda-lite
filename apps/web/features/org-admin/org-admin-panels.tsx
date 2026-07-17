"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
	DataTable,
	type DataTableColumn,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	FormError,
	KeyValueList,
	Spinner,
	StatusBadge,
} from "@afenda/ui-system";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
	type RevokeOrgRoleActionState,
	revokeOrgRoleAction,
} from "@/app/actions/revoke-org-role";
import {
	AssignOrgRoleForm,
	type MemberDirectoryState,
} from "@/features/org-admin/assign-org-role-form";

/**
 * Org-admin panels — DataTable + CAPABLE assign/revoke (GUIDE-018 I3.1 ·
 * ADR-010). Audit View Dialog remains CAPABLE read detail.
 */
export type OrgRoleRow = {
	id: string;
	name: string;
	active: boolean;
	isSystemTemplate: boolean;
};

export type OrgAssignmentRow = {
	id: string;
	userId: string;
	roleId: string;
	roleName: string;
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
	memberDirectory: MemberDirectoryState;
};

const roleColumns: DataTableColumn<OrgRoleRow>[] = [
	{ key: "name", title: "Role", sortable: true },
	{
		key: "isSystemTemplate",
		title: "Catalog",
		render: (value) => (value ? "System template" : "Org custom"),
	},
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
	{
		key: "id",
		title: "ID",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

const assignmentColumns: DataTableColumn<OrgAssignmentRow>[] = [
	{
		key: "userId",
		title: "User",
		render: (value) => <Code>{String(value)}</Code>,
	},
	{ key: "roleName", title: "Role", sortable: true },
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

function eventCountLabel(count: number): string {
	return count === 1 ? "1 event" : `${count} events`;
}

const revokeInitialState: RevokeOrgRoleActionState = null;

function RevokeAssignmentDialog({
	assignment,
	open,
	onOpenChange,
}: {
	assignment: OrgAssignmentRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [state, formAction, pending] = useActionState(
		revokeOrgRoleAction,
		revokeInitialState,
	);

	useEffect(() => {
		if (state?.ok === true) {
			onOpenChange(false);
		}
	}, [state, onOpenChange]);

	const showFormError = !pending && state?.ok === false;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				{assignment ? (
					<form
						action={formAction}
						aria-busy={pending}
						className="flex flex-col gap-(--field-gap)"
					>
						<input type="hidden" name="assignmentId" value={assignment.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Revoke role assignment</AlertDialogTitle>
							<AlertDialogDescription>
								Soft-revokes the active assignment for this organization. The
								audit log keeps the history.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<KeyValueList
							size="sm"
							items={[
								{
									label: "User",
									value: <Code>{assignment.userId}</Code>,
								},
								{ label: "Role", value: assignment.roleName },
								{
									label: "Assignment",
									value: <Code>{assignment.id}</Code>,
								},
							]}
						/>
						{showFormError ? <FormError message={state.message} /> : null}
						<AlertDialogFooter>
							<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
							<Button type="submit" variant="destructive" disabled={pending}>
								{pending ? (
									<>
										<Spinner
											size="sm"
											label="Revoking assignment"
											className="text-primary-foreground"
										/>
										Revoking…
									</>
								) : (
									"Revoke assignment"
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				) : null}
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function OrgAdminPanels({
	roles,
	assignments,
	auditRows,
	memberDirectory,
}: OrgAdminPanelsProps) {
	const [sortBy, setSortBy] = useState<keyof OrgRoleRow>("name");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [selectedAudit, setSelectedAudit] = useState<OrgAuditRow | null>(null);
	const [revokeTarget, setRevokeTarget] = useState<OrgAssignmentRow | null>(
		null,
	);

	const sortedRoles = useMemo(() => {
		const next = [...roles];
		next.sort((a, b) => {
			const left = String(a[sortBy] ?? "");
			const right = String(b[sortBy] ?? "");
			const cmp = left.localeCompare(right);
			return sortDirection === "asc" ? cmp : -cmp;
		});
		return next;
	}, [roles, sortBy, sortDirection]);

	const assignableRoleOptions = useMemo(
		() =>
			roles.filter((role) => role.active).map(({ id, name }) => ({ id, name })),
		[roles],
	);

	return (
		<div className="flex flex-col gap-(--section-gap)">
			<Card>
				<CardHeader>
					<CardTitle>Roles</CardTitle>
					<CardDescription>
						Assignable platform roles for this organization ({roles.length}):
						system templates and org-custom roles.
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
						emptyTitle="No assignable roles"
						emptyDescription="System templates or org-scoped roles appear here when seeded."
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
				<CardContent className="flex flex-col gap-(--section-gap)">
					<div className="flex flex-col gap-(--field-gap)">
						<h3 className="text-sm font-medium text-foreground-secondary">
							Assign role
						</h3>
						<AssignOrgRoleForm
							roles={assignableRoleOptions}
							memberDirectory={memberDirectory}
						/>
					</div>
					<DataTable
						columns={assignmentColumns}
						data={assignments}
						getRowId={(row) => row.id}
						emptyTitle="No role assignments yet"
						emptyDescription="Assign a platform role to an organization member."
						density="comfortable"
						rowActions={(row) => (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setRevokeTarget(row)}
							>
								Revoke
							</Button>
						)}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-(--field-gap)">
					<div className="flex flex-col gap-1.5">
						<CardTitle>RBAC audit</CardTitle>
						<CardDescription>
							Recent org-scoped audit events ({auditRows.length}).
						</CardDescription>
					</div>
					<Badge variant="secondary">{eventCountLabel(auditRows.length)}</Badge>
				</CardHeader>
				<CardContent className="flex flex-col gap-(--field-gap)">
					<DataTable
						columns={auditColumns}
						data={auditRows}
						getRowId={(row) => row.id}
						emptyTitle="No audit rows yet"
						emptyDescription="Invites and role changes write audit entries here."
						density="comfortable"
						rowActions={(row) => (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setSelectedAudit(row)}
							>
								View
							</Button>
						)}
					/>
					<Dialog
						open={selectedAudit !== null}
						onOpenChange={(open) => {
							if (!open) {
								setSelectedAudit(null);
							}
						}}
					>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Audit event</DialogTitle>
								<DialogDescription>
									Org-scoped RBAC audit detail.
								</DialogDescription>
							</DialogHeader>
							{selectedAudit ? (
								<KeyValueList
									size="sm"
									items={[
										{ label: "Action", value: selectedAudit.action },
										{
											label: "Target",
											value: selectedAudit.targetType ?? "—",
										},
										{
											label: "Event ID",
											value: <Code>{selectedAudit.id}</Code>,
										},
									]}
								/>
							) : null}
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>

			{revokeTarget ? (
				<RevokeAssignmentDialog
					key={revokeTarget.id}
					assignment={revokeTarget}
					open
					onOpenChange={(open) => {
						if (!open) {
							setRevokeTarget(null);
						}
					}}
				/>
			) : null}
		</div>
	);
}
