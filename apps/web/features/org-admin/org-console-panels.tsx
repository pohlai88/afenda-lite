"use client";

import {
	Alert,
	AlertDescription,
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertTitle,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
	DataTable,
	type DataTableColumn,
	Empty,
	FormError,
	FormField,
	Input,
	KeyValueList,
	MetricGrid,
	NativeSelect,
	NativeSelectOption,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Spinner,
} from "@afenda/ui-system";
import { Activity, ClipboardList, Users } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
	type DeleteOrganizationActionState,
	deleteOrganizationAction,
} from "@/app/actions/delete-organization";
import {
	type GetOrganizationUsageActionState,
	getOrganizationUsageAction,
} from "@/app/actions/get-organization-usage";
import {
	type ProvisionOrganizationActionState,
	provisionOrganizationAction,
} from "@/app/actions/provision-organization";
import { formatInstantUtc } from "@/modules/platform/format/instant";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

export type OrgConsoleRow = {
	id: string;
	slug: string;
	name: string | null;
	/** ISO-8601 or null when no RBAC audit activity. */
	lastActivityAt: string | null;
};

export type OrgListLoadState =
	| { status: "ready"; organizations: OrgConsoleRow[] }
	| { status: "empty"; organizations: [] }
	| { status: "unavailable"; organizations: []; message: string };

type UsageMetricsView = {
	orgId: string;
	period: string;
	activeMembers: number;
	rbacAuditEvents: number;
	activeRoleAssignments: number;
};

export type UsageLoadState =
	| { status: "ready"; metrics: UsageMetricsView }
	| { status: "unavailable"; message: string };

type OrgConsolePanelsProps = {
	orgList: OrgListLoadState;
	usage: UsageLoadState;
	activeOrgId: string;
};

const orgColumns: DataTableColumn<OrgConsoleRow>[] = [
	{
		key: "name",
		title: "Name",
		sortable: true,
		render: (value, row) =>
			typeof value === "string" && value.length > 0 ? value : row.slug,
	},
	{
		key: "slug",
		title: "Slug",
		sortable: true,
		render: (value) => <Code>{String(value)}</Code>,
	},
	{
		key: "id",
		title: "ID",
		render: (value) => <Code>{String(value)}</Code>,
	},
	{
		key: "lastActivityAt",
		title: "Last activity",
		sortable: true,
		render: (value) =>
			typeof value === "string" && value.length > 0
				? formatInstantUtc(value)
				: "—",
	},
];

const ADMIN_ROLE_OPTIONS = [
	{ value: "admin", label: "Admin" },
	{ value: "operator", label: "Operator" },
	{ value: "client", label: "Client" },
] as const;

const provisionInitialState: ProvisionOrganizationActionState = null;
const deleteInitialState: DeleteOrganizationActionState = null;
const usageInitialState: GetOrganizationUsageActionState = null;

function readProvisionPartialFailure(details: unknown): {
	disposition: string;
	organizationId: string;
	organizationSlug: string;
} | null {
	if (typeof details !== "object" || details === null) {
		return null;
	}
	const disposition = Reflect.get(details, "disposition");
	const organization = Reflect.get(details, "organization");
	if (typeof disposition !== "string") {
		return null;
	}
	if (typeof organization !== "object" || organization === null) {
		return null;
	}
	const organizationId = Reflect.get(organization, "id");
	const organizationSlug = Reflect.get(organization, "slug");
	if (
		typeof organizationId !== "string" ||
		typeof organizationSlug !== "string"
	) {
		return null;
	}
	return { disposition, organizationId, organizationSlug };
}

function ProvisionOrganizationSheet() {
	const [open, setOpen] = useState(false);
	const [state, formAction, pending] = useActionState(
		provisionOrganizationAction,
		provisionInitialState,
	);

	const nameError = actionFieldMessage(state, "name");
	const slugError = actionFieldMessage(state, "slug");
	const emailError = actionFieldMessage(state, "adminEmail");
	const roleError = actionFieldMessage(state, "adminRole");
	const showFormError =
		!pending &&
		state?.ok === false &&
		nameError === undefined &&
		slugError === undefined &&
		emailError === undefined &&
		roleError === undefined;
	const partialFailure =
		showFormError && state?.ok === false
			? readProvisionPartialFailure(state.details)
			: null;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button type="button">Provision organization</Button>
			</SheetTrigger>
			<SheetContent
				side="right"
				className="flex w-full flex-col gap-(--section-gap) sm:max-w-md"
			>
				<SheetHeader>
					<SheetTitle>Provision organization</SheetTitle>
					<SheetDescription>
						Creates the organization in Neon Auth, switches your active org,
						then invites the first admin. Partial failures leave the org for
						retry — there is no silent rollback.
					</SheetDescription>
				</SheetHeader>
				<form
					action={formAction}
					aria-busy={pending}
					className="flex flex-1 flex-col gap-(--field-gap) overflow-y-auto px-4 pb-4"
				>
					<FormField
						label="Name"
						required
						fieldId="provision-org-name"
						error={nameError}
					>
						<Input
							name="name"
							required
							disabled={pending}
							placeholder="Acme Operations"
						/>
					</FormField>
					<FormField
						label="Slug"
						required
						fieldId="provision-org-slug"
						error={slugError}
					>
						<Input
							name="slug"
							required
							disabled={pending}
							placeholder="acme-operations"
							autoComplete="off"
						/>
					</FormField>
					<FormField
						label="Admin email"
						required
						fieldId="provision-org-admin-email"
						error={emailError}
					>
						<Input
							name="adminEmail"
							type="email"
							required
							disabled={pending}
							placeholder="admin@example.com"
							autoComplete="email"
						/>
					</FormField>
					<FormField
						label="Admin role"
						required
						fieldId="provision-org-admin-role"
						error={roleError}
					>
						<NativeSelect
							name="adminRole"
							defaultValue="admin"
							disabled={pending}
						>
							{ADMIN_ROLE_OPTIONS.map((role) => (
								<NativeSelectOption key={role.value} value={role.value}>
									{role.label}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</FormField>

					<Button type="submit" disabled={pending}>
						{pending ? (
							<>
								<Spinner
									size="sm"
									label="Provisioning organization"
									className="text-primary-foreground"
								/>
								Provisioning…
							</>
						) : (
							"Provision organization"
						)}
					</Button>

					{state?.ok === true && !pending ? (
						<Alert role="status">
							<AlertTitle>Organization provisioned</AlertTitle>
							<AlertDescription>
								Created <Code>{state.data.organization.slug}</Code> (
								<Code>{state.data.organization.id}</Code>).
								{state.data.invitationId
									? " First-admin invitation was sent."
									: " Invitation id was not returned; check Neon Auth delivery."}
							</AlertDescription>
						</Alert>
					) : null}

					{showFormError ? (
						<>
							<FormError message={state.message} />
							{partialFailure ? (
								<Alert variant="destructive" role="alert">
									<AlertTitle>Partial provision</AlertTitle>
									<AlertDescription>
										Disposition <Code>{partialFailure.disposition}</Code>. Org{" "}
										<Code>{partialFailure.organizationSlug}</Code> (
										<Code>{partialFailure.organizationId}</Code>) remains — set
										active and retry invite; there is no silent rollback.
									</AlertDescription>
								</Alert>
							) : null}
						</>
					) : null}
				</form>
			</SheetContent>
		</Sheet>
	);
}

function DeleteOrganizationDialog({
	organization,
	open,
	onOpenChange,
}: {
	organization: OrgConsoleRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [state, formAction, pending] = useActionState(
		deleteOrganizationAction,
		deleteInitialState,
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
				{organization ? (
					<form
						action={formAction}
						aria-busy={pending}
						className="flex flex-col gap-(--field-gap)"
					>
						<input type="hidden" name="orgId" value={organization.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>
								Permanently delete organization
							</AlertDialogTitle>
							<AlertDialogDescription>
								This hard-deletes the organization in Neon Auth. Members and
								invitations for this organization are removed. This cannot be
								undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<KeyValueList
							size="sm"
							items={[
								{
									label: "Name",
									value: organization.name ?? organization.slug,
								},
								{
									label: "Slug",
									value: <Code>{organization.slug}</Code>,
								},
								{
									label: "ID",
									value: <Code>{organization.id}</Code>,
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
											label="Deleting organization"
											className="text-primary-foreground"
										/>
										Deleting…
									</>
								) : (
									"Permanently delete"
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				) : null}
			</AlertDialogContent>
		</AlertDialog>
	);
}

function UsageMetricsPanel({
	usage,
	activeOrgId,
}: {
	usage: UsageLoadState;
	activeOrgId: string;
}) {
	const [state, formAction, pending] = useActionState(
		getOrganizationUsageAction,
		usageInitialState,
	);

	const metrics =
		state?.ok === true
			? state.data
			: usage.status === "ready"
				? usage.metrics
				: null;
	const defaultPeriod =
		usage.status === "ready" ? usage.metrics.period : (metrics?.period ?? "");
	const periodError = actionFieldMessage(state, "period");
	const showFormError =
		!pending && state?.ok === false && periodError === undefined;
	const unavailableMessage =
		usage.status === "unavailable" && state?.ok !== true ? usage.message : null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Active organization usage</CardTitle>
				<CardDescription>
					UTC calendar-month counts for active session org{" "}
					<Code>{activeOrgId}</Code>. Requires the requested org to be the
					active session organization.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-(--field-gap)">
				<form
					action={formAction}
					aria-busy={pending}
					className="flex flex-wrap items-end gap-(--field-gap)"
				>
					<FormField
						label="Period (YYYY-MM)"
						required
						fieldId="usage-period"
						error={periodError}
						className="min-w-40 flex-1"
					>
						<Input
							name="period"
							required
							disabled={pending}
							defaultValue={defaultPeriod}
							placeholder="2026-07"
							autoComplete="off"
						/>
					</FormField>
					<Button type="submit" disabled={pending}>
						{pending ? (
							<>
								<Spinner
									size="sm"
									label="Loading usage"
									className="text-primary-foreground"
								/>
								Loading…
							</>
						) : (
							"Refresh usage"
						)}
					</Button>
				</form>

				{showFormError ? <FormError message={state.message} /> : null}

				{unavailableMessage && metrics === null ? (
					<Alert role="status">
						<AlertTitle>Usage unavailable</AlertTitle>
						<AlertDescription>{unavailableMessage}</AlertDescription>
					</Alert>
				) : null}

				{metrics ? (
					<MetricGrid
						columns={3}
						metrics={[
							{
								title: "Active members",
								value: metrics.activeMembers,
								description: `Period ${metrics.period}`,
								icon: <Users className="size-4" aria-hidden />,
							},
							{
								title: "RBAC audit events",
								value: metrics.rbacAuditEvents,
								description: "UTC month half-open window",
								icon: <ClipboardList className="size-4" aria-hidden />,
							},
							{
								title: "Active role assignments",
								value: metrics.activeRoleAssignments,
								description: "platform_role_assignment active rows",
								icon: <Activity className="size-4" aria-hidden />,
							},
						]}
					/>
				) : null}
			</CardContent>
		</Card>
	);
}

/**
 * Org-console panels — list · provision · hard-delete · usage
 * (`@afenda/admin` / `@afenda/admin/usage`). ADR-010 barrel only.
 */
export function OrgConsolePanels({
	orgList,
	usage,
	activeOrgId,
}: OrgConsolePanelsProps) {
	const [sortBy, setSortBy] = useState<keyof OrgConsoleRow>("slug");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [deleteTarget, setDeleteTarget] = useState<OrgConsoleRow | null>(null);

	const sortedOrgs = useMemo(() => {
		const next = [...orgList.organizations];
		next.sort((a, b) => {
			const left = String(a[sortBy] ?? "");
			const right = String(b[sortBy] ?? "");
			const cmp = left.localeCompare(right);
			return sortDirection === "asc" ? cmp : -cmp;
		});
		return next;
	}, [orgList.organizations, sortBy, sortDirection]);

	return (
		<div className="flex flex-col gap-(--section-gap)">
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-(--field-gap)">
					<div className="flex flex-col gap-1.5">
						<CardTitle>Organizations</CardTitle>
						<CardDescription>
							Neon Auth organizations in your session memberships
							{orgList.status === "ready"
								? ` (${orgList.organizations.length})`
								: ""}
							.
						</CardDescription>
					</div>
					<ProvisionOrganizationSheet />
				</CardHeader>
				<CardContent className="flex flex-col gap-(--field-gap)">
					{orgList.status === "unavailable" ? (
						<Alert role="status">
							<AlertTitle>Organizations unavailable</AlertTitle>
							<AlertDescription>{orgList.message}</AlertDescription>
						</Alert>
					) : null}

					{orgList.status === "empty" ? (
						<Empty
							title="No organizations in session"
							description="Provision an organization or join one via Neon Auth invitation."
							size="sm"
						/>
					) : null}

					{orgList.status === "ready" ? (
						<DataTable
							columns={orgColumns}
							data={sortedOrgs}
							getRowId={(row) => row.id}
							sortBy={sortBy}
							sortDirection={sortDirection}
							onSort={(key, direction) => {
								setSortBy(key);
								setSortDirection(direction);
							}}
							emptyTitle="No organizations in session"
							emptyDescription="Provision an organization or join one via Neon Auth invitation."
							density="compact"
							rowActions={(row) => (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setDeleteTarget(row)}
								>
									Delete
								</Button>
							)}
						/>
					) : null}
				</CardContent>
			</Card>

			<UsageMetricsPanel usage={usage} activeOrgId={activeOrgId} />

			<DeleteOrganizationDialog
				organization={deleteTarget}
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}
			/>
		</div>
	);
}
