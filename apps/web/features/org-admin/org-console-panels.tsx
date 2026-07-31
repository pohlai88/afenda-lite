// biome-ignore-all lint/style/noNestedTernary: Exhaustive status and tri-state view mappings remain explicit at their use sites.
// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
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
import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
	type DeleteOrganizationActionState,
	deleteOrganizationAction,
} from "@/app/actions/delete-organization";
import {
	type GetOrganizationUsageActionData,
	type GetOrganizationUsageActionState,
	getOrganizationUsageAction,
} from "@/app/actions/get-organization-usage";
import {
	type ProvisionOrganizationActionState,
	provisionOrganizationAction,
} from "@/app/actions/provision-organization";
import { formatInstantUtc } from "@/modules/platform/format/instant";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

export interface OrgConsoleRow {
	id: string;
	/** ISO-8601 or null when no RBAC audit activity. */
	lastActivityAt: string | null;
	name: string | null;
	slug: string;
}

export type OrgListLoadState =
	| { status: "ready"; organizations: OrgConsoleRow[] }
	| { status: "empty"; organizations: [] }
	| { status: "unavailable"; organizations: []; message: string };

export type UsageLoadState =
	| { status: "ready"; metrics: GetOrganizationUsageActionData }
	| { status: "unavailable"; message: string };

interface OrgConsolePanelsProps {
	activeOrgId: string;
	orgList: OrgListLoadState;
	usage: UsageLoadState;
}

/** Display order + copy for living usage-position metrics (UI owns labels). */
const USAGE_METRIC_CARDS: ReadonlyArray<{
	key: keyof GetOrganizationUsageActionData["metrics"];
	title: string;
	descriptionSuffix: string;
	icon: ReactNode;
}> = [
	{
		key: "activeMembers",
		title: "Active members",
		descriptionSuffix: "Period",
		icon: <Users aria-hidden className="size-4" />,
	},
	{
		key: "rbacAuditEvents",
		title: "RBAC audit events",
		descriptionSuffix: "UTC month",
		icon: <ClipboardList aria-hidden className="size-4" />,
	},
	{
		key: "activeRoleAssignments",
		title: "Active role assignments",
		descriptionSuffix: "Active rows",
		icon: <Activity aria-hidden className="size-4" />,
	},
];

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
	const disposition = readProperty(details, "disposition");
	const organization = readProperty(details, "organization");
	if (typeof disposition !== "string") {
		return null;
	}
	if (typeof organization !== "object" || organization === null) {
		return null;
	}
	const organizationId = readProperty(organization, "id");
	const organizationSlug = readProperty(organization, "slug");
	if (
		typeof organizationId !== "string" ||
		typeof organizationSlug !== "string"
	) {
		return null;
	}
	return { disposition, organizationId, organizationSlug };
}

function readProperty(value: object, key: PropertyKey): unknown {
	let property: unknown;
	try {
		property = Reflect.get(value, key);
	} catch {
		property = undefined;
	}
	return property;
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
		<Sheet onOpenChange={setOpen} open={open}>
			<SheetTrigger asChild>
				<Button type="button">Provision organization</Button>
			</SheetTrigger>
			<SheetContent
				className="flex w-full flex-col gap-(--section-gap) sm:max-w-md"
				side="right"
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
						error={nameError}
						fieldId="provision-org-name"
						label="Name"
						required
					>
						<Input
							disabled={pending}
							name="name"
							placeholder="Acme Operations"
							required
						/>
					</FormField>
					<FormField
						error={slugError}
						fieldId="provision-org-slug"
						label="Slug"
						required
					>
						<Input
							autoComplete="off"
							disabled={pending}
							name="slug"
							placeholder="acme-operations"
							required
						/>
					</FormField>
					<FormField
						error={emailError}
						fieldId="provision-org-admin-email"
						label="Admin email"
						required
					>
						<Input
							autoComplete="email"
							disabled={pending}
							name="adminEmail"
							placeholder="admin@example.com"
							required
							type="email"
						/>
					</FormField>
					<FormField
						error={roleError}
						fieldId="provision-org-admin-role"
						label="Admin role"
						required
					>
						<NativeSelect
							defaultValue="admin"
							disabled={pending}
							name="adminRole"
						>
							{ADMIN_ROLE_OPTIONS.map((role) => (
								<NativeSelectOption key={role.value} value={role.value}>
									{role.label}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</FormField>

					<Button disabled={pending} type="submit">
						{pending ? (
							<>
								<Spinner
									className="text-primary-foreground"
									label="Provisioning organization"
									size="sm"
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
								<Alert role="alert" variant="destructive">
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
		<AlertDialog onOpenChange={onOpenChange} open={open}>
			<AlertDialogContent>
				{organization ? (
					<form
						action={formAction}
						aria-busy={pending}
						className="flex flex-col gap-(--field-gap)"
					>
						<input name="orgId" type="hidden" value={organization.id} />
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
											label="Deleting organization"
											size="sm"
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

	const position =
		state?.ok === true
			? state.data
			: usage.status === "ready"
				? usage.metrics
				: null;
	const defaultPeriod =
		usage.status === "ready" ? usage.metrics.period : (position?.period ?? "");
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
					UTC calendar-month position for active session org{" "}
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
						className="min-w-40 flex-1"
						error={periodError}
						fieldId="usage-period"
						label="Period (YYYY-MM)"
						required
					>
						<Input
							autoComplete="off"
							defaultValue={defaultPeriod}
							disabled={pending}
							name="period"
							placeholder="2026-07"
							required
						/>
					</FormField>
					<Button disabled={pending} type="submit">
						{pending ? (
							<>
								<Spinner
									className="text-primary-foreground"
									label="Loading usage"
									size="sm"
								/>
								Loading…
							</>
						) : (
							"Refresh usage"
						)}
					</Button>
				</form>

				{showFormError ? <FormError message={state.message} /> : null}

				{unavailableMessage && position === null ? (
					<Alert role="status">
						<AlertTitle>Usage unavailable</AlertTitle>
						<AlertDescription>{unavailableMessage}</AlertDescription>
					</Alert>
				) : null}

				{position && position.alerts.length > 0 ? (
					<Alert role="status">
						<AlertTitle>Usage position</AlertTitle>
						<AlertDescription>
							{position.alerts
								.map((alert) => `${alert.metric}: ${alert.level}`)
								.join(" · ")}
						</AlertDescription>
					</Alert>
				) : null}

				{position ? (
					<MetricGrid
						columns={3}
						metrics={USAGE_METRIC_CARDS.map((card) => {
							const cell = position.metrics[card.key];
							return {
								title: card.title,
								value: cell.current,
								description: `Band ${cell.band} · ${card.descriptionSuffix} ${position.period}`,
								icon: card.icon,
							};
						})}
					/>
				) : null}
			</CardContent>
		</Card>
	);
}

/**
 * Org-console panels — list · provision · hard-delete · usage
 * (`@afenda/admin`). ADR-010 barrel only.
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
							description="Provision an organization or join one via Neon Auth invitation."
							size="sm"
							title="No organizations in session"
						/>
					) : null}

					{orgList.status === "ready" ? (
						<DataTable
							columns={orgColumns}
							data={sortedOrgs}
							density="compact"
							emptyDescription="Provision an organization or join one via Neon Auth invitation."
							emptyTitle="No organizations in session"
							getRowId={(row) => row.id}
							onSort={(key, direction) => {
								setSortBy(key);
								setSortDirection(direction);
							}}
							rowActions={(row) => (
								<Button
									onClick={() => setDeleteTarget(row)}
									size="sm"
									type="button"
									variant="outline"
								>
									Delete
								</Button>
							)}
							sortBy={sortBy}
						/>
					) : null}
				</CardContent>
			</Card>

			<UsageMetricsPanel activeOrgId={activeOrgId} usage={usage} />

			<DeleteOrganizationDialog
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}
				open={deleteTarget !== null}
				organization={deleteTarget}
			/>
		</div>
	);
}
