// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
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
import { formatInstantUtc } from "@/modules/platform/format/instant";

/**
 * Org-admin panels — DataTable + CAPABLE assign/revoke (GUIDE-018 I3.1 ·
 * ADR-010 · I3.4 Sheet assign). Audit View Dialog projects full RBAC audit
 * fields from Platform domain (actor, target, values, when).
 */
export interface OrgRoleRow {
	active: boolean;
	id: string;
	isSystemTemplate: boolean;
	name: string;
}

export interface OrgAssignmentRow {
	id: string;
	roleId: string;
	roleName: string;
	scopeType: string;
	userId: string;
	/** Directory label (`name · email`) when known; else Neon `userId`. */
	userLabel: string;
}

export interface OrgAuditRow {
	action: string;
	/** Directory label when known; else Neon `actorUserId`. */
	actorLabel: string;
	actorUserId: string;
	/** ISO-8601 from domain `createdAt`. */
	createdAt: string;
	id: string;
	newValueJson: string | null;
	oldValueJson: string | null;
	reason: string | null;
	roleId: string | null;
	targetId: string | null;
	targetType: string | null;
}

interface OrgAdminPanelsProps {
	assignments: OrgAssignmentRow[];
	auditRows: OrgAuditRow[];
	memberDirectory: MemberDirectoryState;
	roles: OrgRoleRow[];
}

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
				label={value ? "Active" : "Inactive"}
				status={value ? "active" : "inactive"}
			/>
		),
	},
	{
		key: "id",
		title: "ID",
		render: (value) => <Code>{String(value)}</Code>,
	},
];

function AssignmentUserCell({
	userId,
	userLabel,
}: {
	userId: string;
	userLabel: string;
}) {
	if (userLabel === userId) {
		return <Code>{userId}</Code>;
	}
	return (
		<span className="flex flex-col gap-0.5">
			<span className="text-foreground text-sm">{userLabel}</span>
			<Code className="text-foreground-secondary text-xs">{userId}</Code>
		</span>
	);
}

function auditDetailValue(value: string | null | undefined): string {
	if (value === null || value.trim().length === 0) {
		return "—";
	}
	return value;
}

const assignmentColumns: DataTableColumn<OrgAssignmentRow>[] = [
	{
		key: "userLabel",
		title: "User",
		sortable: true,
		render: (_value, row) => (
			<AssignmentUserCell userId={row.userId} userLabel={row.userLabel} />
		),
	},
	{ key: "roleName", title: "Role", sortable: true },
	{ key: "scopeType", title: "Scope" },
];

const auditColumns: DataTableColumn<OrgAuditRow>[] = [
	{ key: "action", title: "Action", sortable: true },
	{
		key: "actorLabel",
		title: "Actor",
		sortable: true,
		render: (_value, row) => (
			<AssignmentUserCell userId={row.actorUserId} userLabel={row.actorLabel} />
		),
	},
	{
		key: "targetType",
		title: "Target",
		render: (value) => (value ? String(value) : "—"),
	},
	{
		key: "createdAt",
		title: "When",
		sortable: true,
		render: (value) => formatInstantUtc(String(value)),
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
		<AlertDialog onOpenChange={onOpenChange} open={open}>
			<AlertDialogContent>
				{assignment ? (
					<form
						action={formAction}
						aria-busy={pending}
						className="flex flex-col gap-(--field-gap)"
					>
						<input name="assignmentId" type="hidden" value={assignment.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Revoke role assignment</AlertDialogTitle>
							<AlertDialogDescription>
								Soft-revokes the active assignment for this organization. The
								audit log keeps the history.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<KeyValueList
							items={[
								{
									label: "User",
									value:
										assignment.userLabel === assignment.userId ? (
											<Code>{assignment.userId}</Code>
										) : (
											assignment.userLabel
										),
								},
								{ label: "Role", value: assignment.roleName },
								{
									label: "Assignment",
									value: <Code>{assignment.id}</Code>,
								},
							]}
							size="sm"
						/>
						{showFormError ? <FormError message={state.message} /> : null}
						<AlertDialogFooter>
							<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
							<Button disabled={pending} type="submit" variant="destructive">
								{pending ? (
									<>
										<Spinner
											className="text-primary-foreground"
											label="Revoking assignment"
											size="sm"
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
	const [assignOpen, setAssignOpen] = useState(false);

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
						density="compact"
						emptyDescription="System templates or org-scoped roles appear here when seeded."
						emptyTitle="No assignable roles"
						getRowId={(row) => row.id}
						onSort={(key, direction) => {
							setSortBy(key);
							setSortDirection(direction);
						}}
						sortBy={sortBy}
						sortDirection={sortDirection}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-(--field-gap)">
					<div className="flex flex-col gap-1.5">
						<CardTitle>Role assignments</CardTitle>
						<CardDescription>
							Active assignments for this organization ({assignments.length}).
						</CardDescription>
					</div>
					<Sheet onOpenChange={setAssignOpen} open={assignOpen}>
						<SheetTrigger asChild>
							<Button type="button">Assign role</Button>
						</SheetTrigger>
						<SheetContent
							className="flex w-full flex-col gap-(--section-gap) sm:max-w-md"
							side="right"
						>
							<SheetHeader>
								<SheetTitle>Assign role</SheetTitle>
								<SheetDescription>
									Bind a platform role to an organization member. Soft-revoke
									keeps audit history.
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-1 flex-col gap-(--field-gap) overflow-y-auto px-4 pb-4">
								<AssignOrgRoleForm
									memberDirectory={memberDirectory}
									roles={assignableRoleOptions}
								/>
							</div>
						</SheetContent>
					</Sheet>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={assignmentColumns}
						data={assignments}
						density="compact"
						emptyDescription="Assign a platform role to an organization member."
						emptyTitle="No role assignments yet"
						getRowId={(row) => row.id}
						rowActions={(row) => (
							<Button
								onClick={() => setRevokeTarget(row)}
								size="sm"
								type="button"
								variant="outline"
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
						density="compact"
						emptyDescription="Invites and role changes write audit entries here."
						emptyTitle="No audit rows yet"
						getRowId={(row) => row.id}
						rowActions={(row) => (
							<Button
								onClick={() => setSelectedAudit(row)}
								size="sm"
								type="button"
								variant="outline"
							>
								View
							</Button>
						)}
					/>
					<Dialog
						onOpenChange={(open) => {
							if (!open) {
								setSelectedAudit(null);
							}
						}}
						open={selectedAudit !== null}
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
									items={[
										{ label: "Action", value: selectedAudit.action },
										{
											label: "Actor",
											value: (
												<AssignmentUserCell
													userId={selectedAudit.actorUserId}
													userLabel={selectedAudit.actorLabel}
												/>
											),
										},
										{
											label: "Target type",
											value: auditDetailValue(selectedAudit.targetType),
										},
										{
											label: "Target ID",
											value: selectedAudit.targetId ? (
												<Code>{selectedAudit.targetId}</Code>
											) : (
												"—"
											),
										},
										{
											label: "Role ID",
											value: selectedAudit.roleId ? (
												<Code>{selectedAudit.roleId}</Code>
											) : (
												"—"
											),
										},
										{
											label: "Reason",
											value: auditDetailValue(selectedAudit.reason),
										},
										{
											label: "When",
											value: formatInstantUtc(selectedAudit.createdAt),
										},
										{
											label: "Previous value",
											value: selectedAudit.oldValueJson ? (
												<Code className="whitespace-pre-wrap text-xs">
													{selectedAudit.oldValueJson}
												</Code>
											) : (
												"—"
											),
										},
										{
											label: "New value",
											value: selectedAudit.newValueJson ? (
												<Code className="whitespace-pre-wrap text-xs">
													{selectedAudit.newValueJson}
												</Code>
											) : (
												"—"
											),
										},
										{
											label: "Event ID",
											value: <Code>{selectedAudit.id}</Code>,
										},
									]}
									size="sm"
								/>
							) : null}
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>

			{revokeTarget ? (
				<RevokeAssignmentDialog
					assignment={revokeTarget}
					key={revokeTarget.id}
					onOpenChange={(open) => {
						if (!open) {
							setRevokeTarget(null);
						}
					}}
					open
				/>
			) : null}
		</div>
	);
}
