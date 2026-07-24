import { getSession, requireRole } from "@afenda/auth";
import { queryDomainEvents } from "@afenda/events";
import {
	listCandidates,
	listEmployees,
	listLeaveRequests,
	listPendingApprovalLeaveRequests,
} from "@afenda/human-resources";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	MetricGrid,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import Link from "next/link";

import { requirePermission } from "@/features/auth/require-permission";
import { AttendanceControl } from "@/features/human-resources/attendance-control";
import {
	formatHrInstant,
	getHrMessages,
	type HrDisplayPreferences,
} from "@/features/human-resources/display-preferences";
import { reconcileHrQueueHealth } from "@/features/human-resources/operations-health";
import { HR_PAGE_SIZE } from "@/features/human-resources/pagination";
import { RetryEventForm } from "@/features/human-resources/retry-event-form";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type ShellProps = {
	page: number;
	preferences: HrDisplayPreferences;
};

function HrHeader({
	eyebrow,
	title,
	description,
}: {
	eyebrow: string;
	title: string;
	description: string;
}) {
	return (
		<header className="space-y-2">
			<p className="text-sm text-muted-foreground">{eyebrow}</p>
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			<p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
		</header>
	);
}

function LoadAlert({ message }: { message: string }) {
	return (
		<Alert variant="destructive" role="alert">
			<AlertTitle>Unable to load HR data</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

function PageControls({
	path,
	page,
	hasNext,
	preferences,
}: {
	path: string;
	page: number;
	hasNext: boolean;
	preferences: HrDisplayPreferences;
}) {
	const href = (target: number) =>
		`${path}?page=${target}&locale=${preferences.locale}&timeZone=${encodeURIComponent(preferences.timeZone)}`;
	return (
		<nav aria-label="Pagination" className="flex items-center justify-between">
			<Button asChild variant="outline" disabled={page <= 1}>
				<Link
					href={href(Math.max(1, page - 1))}
					aria-disabled={page <= 1}
					tabIndex={page <= 1 ? -1 : undefined}
				>
					Previous
				</Link>
			</Button>
			<span className="text-sm text-muted-foreground">Page {page}</span>
			<Button asChild variant="outline" disabled={!hasNext}>
				<Link
					href={href(page + 1)}
					aria-disabled={!hasNext}
					tabIndex={!hasNext ? -1 : undefined}
				>
					Next
				</Link>
			</Button>
		</nav>
	);
}

export async function EmployeeHrShell({ page, preferences }: ShellProps) {
	const session = await getSession();
	await requirePermission(session, "human-resources.leave-request.own");
	const canRecordAttendance = await sessionHasPermission(
		session,
		"human-resources.time.attendance.self.record",
	);
	const result = await listLeaveRequests(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			page,
			pageSize: HR_PAGE_SIZE,
		},
		createHumanResourcesCommandOptions(),
	);
	const messages = getHrMessages(preferences.locale);

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
			<HrHeader
				eyebrow={`Employee self-service · ${preferences.timeZone}`}
				title={messages.employeeTitle}
				description="Review your leave history and record attendance. Employee identity is resolved from your signed-in account; employee IDs are never accepted from this page."
			/>
			{!result.ok ? <LoadAlert message={messages.loadFailed} /> : null}
			<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
				<Card>
					<CardHeader>
						<CardTitle>My leave requests</CardTitle>
						<CardDescription>
							Own-record view, {HR_PAGE_SIZE} rows per page.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Dates</TableHead>
										<TableHead>Quantity</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Updated</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{result.ok && result.data.requests.length > 0 ? (
										result.data.requests.map((request) => (
											<TableRow key={request.id}>
												<TableCell>
													{request.startDate} – {request.endDate}
												</TableCell>
												<TableCell>
													{request.requestedQuantity} {request.unit}
												</TableCell>
												<TableCell>{request.status}</TableCell>
												<TableCell>
													{formatHrInstant(request.updatedAt, preferences)}
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={4}>
												No leave requests found.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
						<PageControls
							path="/client/human-resources"
							page={page}
							hasNext={
								result.ok &&
								page * result.data.pageSize < result.data.totalCount
							}
							preferences={preferences}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Attendance</CardTitle>
						<CardDescription>
							Events use the current instant and {preferences.timeZone}.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{canRecordAttendance ? (
							<AttendanceControl timeZone={preferences.timeZone} />
						) : (
							<p className="text-sm text-muted-foreground">
								Attendance recording is not enabled for your role.
							</p>
						)}
					</CardContent>
				</Card>
			</div>
			{(await sessionHasPermission(
				session,
				"human-resources.leave-request.approve-team",
			)) ? (
				<Button asChild variant="outline">
					<Link href="/client/human-resources/manager">
						Open manager workspace
					</Link>
				</Button>
			) : null}
		</section>
	);
}

export async function ManagerHrShell({ page, preferences }: ShellProps) {
	const session = await getSession();
	await requirePermission(
		session,
		"human-resources.leave-request.approve-team",
	);
	const result = await listPendingApprovalLeaveRequests(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			page,
			pageSize: HR_PAGE_SIZE,
		},
		createHumanResourcesCommandOptions(),
	);
	const messages = getHrMessages(preferences.locale);

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
			<HrHeader
				eyebrow="Manager self-service"
				title={messages.managerTitle}
				description="Review leave awaiting action for employees in your reporting scope. Team membership is resolved server-side from the signed-in manager."
			/>
			{!result.ok ? <LoadAlert message={messages.loadFailed} /> : null}
			<Card>
				<CardHeader>
					<CardTitle>Pending team leave</CardTitle>
					<CardDescription>
						Manager-scoped approvals, {HR_PAGE_SIZE} rows per page.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Dates</TableHead>
									<TableHead>Quantity</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{result.ok && result.data.requests.length > 0 ? (
									result.data.requests.map((request) => (
										<TableRow key={request.id}>
											<TableCell>{request.employeeId}</TableCell>
											<TableCell>
												{request.startDate} – {request.endDate}
											</TableCell>
											<TableCell>
												{request.requestedQuantity} {request.unit}
											</TableCell>
											<TableCell>{request.status}</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={4}>
											No team leave is awaiting approval.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
					<PageControls
						path="/client/human-resources/manager"
						page={page}
						hasNext={
							result.ok && page * result.data.pageSize < result.data.totalCount
						}
						preferences={preferences}
					/>
				</CardContent>
			</Card>
		</section>
	);
}

export async function AdminHrShell({ page, preferences }: ShellProps) {
	const session = await requireRole("operator");
	await requirePermission(session, "human-resources.employee.read");
	const canViewCandidates = await sessionHasPermission(
		session,
		"human-resources.candidate.manage",
	);
	const employees = await listEmployees(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			page,
			pageSize: HR_PAGE_SIZE,
		},
		createHumanResourcesCommandOptions(),
	);
	const messages = getHrMessages(preferences.locale);

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
			<HrHeader
				eyebrow="Operator · Human resources"
				title={messages.adminTitle}
				description="Tenant-scoped employee administration with separate candidate and operational recovery workspaces."
			/>
			{!employees.ok ? <LoadAlert message={messages.loadFailed} /> : null}
			<div className="flex flex-wrap gap-3">
				{canViewCandidates ? (
					<Button asChild variant="outline">
						<Link href="/admin/human-resources/candidates">Candidates</Link>
					</Button>
				) : null}
				<Button asChild variant="outline">
					<Link href="/admin/human-resources/operations">Operations</Link>
				</Button>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Employee register</CardTitle>
					<CardDescription>
						{employees.ok ? employees.data.totalCount : 0} employees ·{" "}
						{HR_PAGE_SIZE} rows per page
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee number</TableHead>
									<TableHead>Legal name</TableHead>
									<TableHead>Version</TableHead>
									<TableHead>Updated</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employees.ok && employees.data.employees.length > 0 ? (
									employees.data.employees.map((employee) => (
										<TableRow key={employee.id}>
											<TableCell>{employee.employeeNumber}</TableCell>
											<TableCell>{employee.legalName}</TableCell>
											<TableCell>{employee.version}</TableCell>
											<TableCell>
												{formatHrInstant(employee.updatedAt, preferences)}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={4}>No employees found.</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
					<PageControls
						path="/admin/human-resources"
						page={page}
						hasNext={
							employees.ok &&
							page * employees.data.pageSize < employees.data.totalCount
						}
						preferences={preferences}
					/>
				</CardContent>
			</Card>
		</section>
	);
}

export async function CandidateHrShell({ page, preferences }: ShellProps) {
	const session = await requireRole("operator");
	await requirePermission(session, "human-resources.candidate.manage");
	const result = await listCandidates(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			page,
			pageSize: HR_PAGE_SIZE,
		},
		createHumanResourcesCommandOptions(),
	);
	const messages = getHrMessages(preferences.locale);

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
			<HrHeader
				eyebrow="Recruitment operations"
				title={messages.candidateTitle}
				description="Permission-gated candidate records for the organization. Contact details remain confined to recruitment operators."
			/>
			{!result.ok ? <LoadAlert message={messages.loadFailed} /> : null}
			<Card>
				<CardHeader>
					<CardTitle>Candidates</CardTitle>
					<CardDescription>
						{result.ok ? result.data.totalCount : 0} candidates
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Updated</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{result.ok && result.data.candidates.length > 0 ? (
									result.data.candidates.map((candidate) => (
										<TableRow key={candidate.id}>
											<TableCell>{candidate.displayName}</TableCell>
											<TableCell>{candidate.email}</TableCell>
											<TableCell>{candidate.status}</TableCell>
											<TableCell>
												{formatHrInstant(candidate.updatedAt, preferences)}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={4}>No candidates found.</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
					<PageControls
						path="/admin/human-resources/candidates"
						page={page}
						hasNext={
							result.ok && page * result.data.pageSize < result.data.totalCount
						}
						preferences={preferences}
					/>
				</CardContent>
			</Card>
		</section>
	);
}

export async function OperationsHrShell({ page, preferences }: ShellProps) {
	const session = await requireRole("operator");
	await requirePermission(session, "human-resources.organization.read");
	const canRepair = await sessionHasPermission(
		session,
		"human-resources.organization.manage",
	);
	const base = {
		organizationId: session.orgId,
		sourceModule: "human-resources" as const,
		page,
		pageSize: HR_PAGE_SIZE,
	};
	const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);
	const [pending, failed, processed, stalePending] = await Promise.all([
		queryDomainEvents({ ...base, status: "pending" }),
		queryDomainEvents({ ...base, status: "failed" }),
		queryDomainEvents({ ...base, status: "processed" }),
		queryDomainEvents({
			...base,
			status: "pending",
			to: staleCutoff,
			page: 1,
		}),
	]);
	const loadFailed =
		!pending.ok || !failed.ok || !processed.ok || !stalePending.ok;
	const health = reconcileHrQueueHealth({
		pending: pending.ok ? pending.data : null,
		failed: failed.ok ? failed.data : null,
		processed: processed.ok ? processed.data : null,
		stalePending: stalePending.ok ? stalePending.data : null,
	});
	const messages = getHrMessages(preferences.locale);

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
			<HrHeader
				eyebrow="Operator · Reliability"
				title={messages.operationsTitle}
				description="Organization-isolated HR outbox health, SLO evaluation, and explicitly confirmed failed-event recovery."
			/>
			{loadFailed ? <LoadAlert message={messages.loadFailed} /> : null}
			{!health.sloHealthy ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>HR integration SLO breached</AlertTitle>
					<AlertDescription>
						Target: zero failed events, no events pending over 15 minutes, and
						no more than 10 pending events. Investigate before retrying.
					</AlertDescription>
				</Alert>
			) : (
				<Alert role="status">
					<AlertTitle>HR integration SLO healthy</AlertTitle>
					<AlertDescription>
						No failed-event breach or pending-queue saturation detected.
					</AlertDescription>
				</Alert>
			)}
			<MetricGrid
				columns={3}
				metrics={[
					{
						title: "Pending events",
						value: health.pending,
						description: "SLO threshold ≤ 10",
						trend: health.pending > 10 ? "down" : "neutral",
					},
					{
						title: "Failed events",
						value: health.failed,
						description: "SLO target 0",
						trend: health.failed > 0 ? "down" : "neutral",
					},
					{
						title: "Stale pending",
						value: health.stalePending,
						description: "Older than 15 minutes",
						trend: health.stalePending > 0 ? "down" : "neutral",
					},
				]}
			/>
			<Card>
				<CardHeader>
					<CardTitle>Queue reconciliation</CardTitle>
					<CardDescription>
						Processed lifetime total: {health.processed}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{health.reconciliationIssues.length === 0 ? (
						<p className="text-sm text-muted-foreground" role="status">
							All sampled queue rows match the HR module and expected state.
						</p>
					) : (
						<ul className="list-disc space-y-1 pl-5 text-sm">
							{health.reconciliationIssues.map((issue) => (
								<li key={issue}>{issue}</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Failed integration events</CardTitle>
					<CardDescription>
						Errors are summarized without exposing payloads or internal stack
						traces.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Event</TableHead>
									<TableHead>Occurred</TableHead>
									<TableHead>Attempts</TableHead>
									<TableHead>Correlation</TableHead>
									<TableHead>Recovery</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{failed.ok && failed.data.entries.length > 0 ? (
									failed.data.entries.map((event) => (
										<TableRow key={event.id}>
											<TableCell>{event.type}</TableCell>
											<TableCell>
												{formatHrInstant(event.occurredAt, preferences)}
											</TableCell>
											<TableCell>{event.attempts}</TableCell>
											<TableCell>{event.correlationId}</TableCell>
											<TableCell>
												{canRepair ? (
													<RetryEventForm eventId={event.id} />
												) : (
													<span className="text-sm text-muted-foreground">
														Read only
													</span>
												)}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={5}>No failed HR events.</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
					<PageControls
						path="/admin/human-resources/operations"
						page={page}
						hasNext={
							failed.ok && page * failed.data.pageSize < failed.data.total
						}
						preferences={preferences}
					/>
				</CardContent>
			</Card>
		</section>
	);
}
