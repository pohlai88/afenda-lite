import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Empty,
	KeyValueList,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@afenda/ui-system";

import { AttendanceControl } from "@/features/human-resources/attendance-control";
import {
	formatHrInstant,
	formatHrLocalDate,
	type HrDisplayPreferences,
} from "@/features/human-resources/display-preferences";

import {
	LeaveDraftForm,
	LeaveRequestTransitionForm,
	PolicyAcknowledgementForm,
	TimesheetSubmitForm,
} from "./self-service-journey-forms";
import type { SelfServicePermissions, SelfServiceSnapshot } from "./types";

type Props = {
	permissions: SelfServicePermissions;
	preferences: HrDisplayPreferences;
	snapshot: SelfServiceSnapshot;
};

function LoadError({ message }: { message?: string | undefined }) {
	if (!message) return null;
	return (
		<Alert variant="destructive" role="alert">
			<AlertTitle>Information unavailable</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

function statusLabel(value: string) {
	return <Badge variant="outline">{value.replaceAll("_", " ")}</Badge>;
}

function firstVisibleTab(permissions: SelfServicePermissions) {
	if (permissions.canViewProfile) return "profile";
	if (permissions.canViewLeave) return "leave";
	if (permissions.canViewAttendance || permissions.canRecordAttendance)
		return "attendance";
	if (permissions.canViewTimesheet) return "timesheet";
	if (permissions.canViewLearning || permissions.canViewCertifications)
		return "learning";
	if (permissions.canViewPerformance) return "performance";
	return "documents";
}

export function SelfServiceWorkspace({
	permissions,
	preferences,
	snapshot,
}: Props) {
	return (
		<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
			<header className="space-y-2">
				<p className="text-sm font-medium text-foreground-secondary">
					Employee self-service · {preferences.timeZone}
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">
					My employee workspace
				</h1>
				<p className="max-w-3xl text-sm text-foreground-secondary">
					Review your employment information and complete the journeys enabled
					for your organization. Your employee identity is resolved from the
					signed-in account.
				</p>
			</header>

			<Tabs defaultValue={firstVisibleTab(permissions)} className="space-y-6">
				<TabsList className="h-auto flex-wrap justify-start">
					{permissions.canViewProfile ? (
						<TabsTrigger value="profile">Profile</TabsTrigger>
					) : null}
					{permissions.canViewLeave ? (
						<TabsTrigger value="leave">Leave</TabsTrigger>
					) : null}
					{permissions.canViewAttendance || permissions.canRecordAttendance ? (
						<TabsTrigger value="attendance">Attendance</TabsTrigger>
					) : null}
					{permissions.canViewTimesheet ? (
						<TabsTrigger value="timesheet">Timesheet</TabsTrigger>
					) : null}
					{permissions.canViewLearning || permissions.canViewCertifications ? (
						<TabsTrigger value="learning">Learning</TabsTrigger>
					) : null}
					{permissions.canViewPerformance ? (
						<TabsTrigger value="performance">Goals & reviews</TabsTrigger>
					) : null}
					{permissions.canViewDocuments ||
					permissions.canViewAcknowledgements ? (
						<TabsTrigger value="documents">Documents</TabsTrigger>
					) : null}
				</TabsList>

				{permissions.canViewProfile ? (
					<TabsContent value="profile">
						<Card>
							<CardHeader>
								<CardTitle>Profile</CardTitle>
								<CardDescription>
									Your current employee and worker record.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<LoadError message={snapshot.errors.profile} />
								{snapshot.profile ? (
									<KeyValueList
										items={[
											{ label: "Legal name", value: snapshot.profile.name },
											{
												label: "Preferred name",
												value: snapshot.profile.preferredName ?? "Not recorded",
											},
											{
												label: "Employee number",
												value: snapshot.profile.employeeNumber,
											},
											{
												label: "Employment status",
												value:
													snapshot.profile.employmentStatus ?? "Not recorded",
											},
											{
												label: "Worker status",
												value: snapshot.profile.workerStatus ?? "Not recorded",
											},
											{
												label: "Phone",
												value: snapshot.profile.phone ?? "Not recorded",
											},
										]}
									/>
								) : (
									<Empty size="sm" title="Profile unavailable" />
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}

				{permissions.canViewLeave ? (
					<TabsContent value="leave" className="space-y-6">
						<LoadError message={snapshot.errors.leave} />
						<Card>
							<CardHeader>
								<CardTitle>Leave balances</CardTitle>
								<CardDescription>
									Available entitlements for the current period.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{snapshot.leaveBalances.length > 0 ? (
									<div className="grid gap-4 md:grid-cols-2">
										{snapshot.leaveBalances.map((balance) => (
											<Card key={balance.entitlementId}>
												<CardHeader>
													<CardTitle>{balance.policyName}</CardTitle>
													<CardDescription>
														{formatHrLocalDate(
															balance.periodStart,
															preferences,
														)}{" "}
														–{" "}
														{formatHrLocalDate(balance.periodEnd, preferences)}
													</CardDescription>
												</CardHeader>
												<CardContent className="text-lg font-medium">
													{balance.balance} {balance.unit}
												</CardContent>
											</Card>
										))}
									</div>
								) : (
									<Empty size="sm" title="No leave entitlements" />
								)}
								{snapshot.leaveBalances.length > 0 ? (
									<LeaveDraftForm
										entitlements={snapshot.leaveBalances.map((balance) => ({
											id: balance.entitlementId,
											label: `${balance.policyName} · ${balance.balance} ${balance.unit}`,
										}))}
									/>
								) : null}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Leave requests</CardTitle>
							</CardHeader>
							<CardContent>
								{snapshot.leaveRequests.length > 0 ? (
									<div className="overflow-x-auto">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Policy</TableHead>
													<TableHead>Dates</TableHead>
													<TableHead>Quantity</TableHead>
													<TableHead>Status</TableHead>
													<TableHead>Action</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{snapshot.leaveRequests.map((request) => (
													<TableRow key={request.id}>
														<TableCell>{request.policyName}</TableCell>
														<TableCell>
															{formatHrLocalDate(
																request.startDate,
																preferences,
															)}{" "}
															–{" "}
															{formatHrLocalDate(request.endDate, preferences)}
														</TableCell>
														<TableCell>
															{request.quantity} {request.unit}
														</TableCell>
														<TableCell>{statusLabel(request.status)}</TableCell>
														<TableCell>
															<LeaveRequestTransitionForm
																request={request}
																canCancelApproved={
																	permissions.canCancelApprovedLeave
																}
															/>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								) : (
									<Empty size="sm" title="No leave requests" />
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}

				{permissions.canViewAttendance || permissions.canRecordAttendance ? (
					<TabsContent value="attendance" className="space-y-6">
						<LoadError message={snapshot.errors.attendance} />
						<div className="grid gap-6 lg:grid-cols-2">
							{permissions.canRecordAttendance ? (
								<Card>
									<CardHeader>
										<CardTitle>Record attendance</CardTitle>
										<CardDescription>
											Current status: {snapshot.attendance.currentStatus}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<AttendanceControl timeZone={preferences.timeZone} />
									</CardContent>
								</Card>
							) : null}
							{permissions.canViewAttendance ? (
								<Card>
									<CardHeader>
										<CardTitle>Recent sessions</CardTitle>
									</CardHeader>
									<CardContent>
										{snapshot.attendance.sessions.length > 0 ? (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Date</TableHead>
														<TableHead>Worked</TableHead>
														<TableHead>Break</TableHead>
														<TableHead>Status</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{snapshot.attendance.sessions.map((session) => (
														<TableRow key={session.id}>
															<TableCell>
																{formatHrLocalDate(
																	session.localWorkDate,
																	preferences,
																)}
															</TableCell>
															<TableCell>{session.workedMinutes} min</TableCell>
															<TableCell>{session.breakMinutes} min</TableCell>
															<TableCell>
																{statusLabel(session.status)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										) : (
											<Empty size="sm" title="No attendance sessions" />
										)}
									</CardContent>
								</Card>
							) : null}
						</div>
					</TabsContent>
				) : null}

				{permissions.canViewTimesheet ? (
					<TabsContent value="timesheet">
						<Card>
							<CardHeader>
								<CardTitle>Current timesheet</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<LoadError message={snapshot.errors.timesheet} />
								{snapshot.timesheet ? (
									<>
										<KeyValueList
											items={[
												{ label: "Status", value: snapshot.timesheet.status },
												{
													label: "Period",
													value: `${formatHrLocalDate(snapshot.timesheet.periodStart, preferences)} – ${formatHrLocalDate(snapshot.timesheet.periodEnd, preferences)}`,
												},
												{
													label: "Recorded",
													value: `${snapshot.timesheet.recordedMinutes} minutes`,
												},
												{
													label: "Approved",
													value: `${snapshot.timesheet.approvedMinutes} minutes`,
												},
											]}
										/>
										{permissions.canSubmitTimesheet &&
										snapshot.timesheet.status === "draft" ? (
											<TimesheetSubmitForm timesheet={snapshot.timesheet} />
										) : null}
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Date</TableHead>
													<TableHead>Type</TableHead>
													<TableHead>Recorded</TableHead>
													<TableHead>Approved</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{snapshot.timesheet.entries.map((entry) => (
													<TableRow key={entry.id}>
														<TableCell>
															{formatHrLocalDate(entry.workDate, preferences)}
														</TableCell>
														<TableCell>{entry.timeType}</TableCell>
														<TableCell>{entry.recordedMinutes} min</TableCell>
														<TableCell>{entry.approvedMinutes} min</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</>
								) : (
									<Empty size="sm" title="No current timesheet" />
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}

				{permissions.canViewLearning || permissions.canViewCertifications ? (
					<TabsContent value="learning" className="space-y-6">
						<LoadError message={snapshot.errors.learning} />
						<div className="grid gap-6 lg:grid-cols-2">
							{permissions.canViewLearning ? (
								<Card>
									<CardHeader>
										<CardTitle>Learning assignments</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{snapshot.learning.assignments.length > 0 ? (
											snapshot.learning.assignments.map((assignment) => (
												<div
													key={assignment.id}
													className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0"
												>
													<div className="flex items-center justify-between gap-4">
														<p className="text-sm font-medium">
															{assignment.course}
														</p>
														{statusLabel(assignment.status)}
													</div>
													<p className="text-sm text-foreground-secondary">
														Due{" "}
														{assignment.dueOn
															? formatHrLocalDate(assignment.dueOn, preferences)
															: "not set"}
													</p>
												</div>
											))
										) : (
											<Empty size="sm" title="No learning assignments" />
										)}
									</CardContent>
								</Card>
							) : null}
							{permissions.canViewCertifications ? (
								<Card>
									<CardHeader>
										<CardTitle>Certifications</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{snapshot.learning.certifications.length > 0 ? (
											snapshot.learning.certifications.map((certification) => (
												<div
													key={certification.id}
													className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0"
												>
													<div className="flex items-center justify-between gap-4">
														<p className="text-sm font-medium">
															{certification.course}
														</p>
														{statusLabel(certification.status)}
													</div>
													<p className="text-sm text-foreground-secondary">
														{certification.code} · issued{" "}
														{formatHrLocalDate(
															certification.issuedOn,
															preferences,
														)}
													</p>
												</div>
											))
										) : (
											<Empty size="sm" title="No certifications" />
										)}
									</CardContent>
								</Card>
							) : null}
						</div>
					</TabsContent>
				) : null}

				{permissions.canViewPerformance ? (
					<TabsContent value="performance" className="space-y-6">
						<LoadError message={snapshot.errors.performance} />
						<div className="grid gap-6 lg:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle>Goals</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{snapshot.performance.goals.length > 0 ? (
										snapshot.performance.goals.map((goal) => (
											<div
												key={goal.id}
												className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0"
											>
												<div className="flex items-center justify-between gap-4">
													<p className="text-sm font-medium">{goal.title}</p>
													{statusLabel(goal.status)}
												</div>
												<p className="text-sm text-foreground-secondary">
													{formatHrLocalDate(goal.periodStart, preferences)} –{" "}
													{formatHrLocalDate(goal.periodEnd, preferences)}
												</p>
											</div>
										))
									) : (
										<Empty size="sm" title="No goals" />
									)}
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle>Performance reviews</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{snapshot.performance.reviews.length > 0 ? (
										snapshot.performance.reviews.map((review) => (
											<div
												key={review.id}
												className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0"
											>
												<div className="flex items-center justify-between gap-4">
													<p className="text-sm font-medium">Review</p>
													{statusLabel(review.status)}
												</div>
												<p className="text-sm text-foreground-secondary">
													Rating {review.rating ?? "not recorded"} · updated{" "}
													{formatHrInstant(review.updatedAt, preferences)}
												</p>
											</div>
										))
									) : (
										<Empty size="sm" title="No performance reviews" />
									)}
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				) : null}

				{permissions.canViewDocuments || permissions.canViewAcknowledgements ? (
					<TabsContent value="documents" className="space-y-6">
						<LoadError message={snapshot.errors.compliance} />
						{snapshot.compliance.summary ? (
							<Alert role="status">
								<AlertTitle>Compliance summary</AlertTitle>
								<AlertDescription>
									{snapshot.compliance.summary.missingDocuments} missing
									documents · {snapshot.compliance.summary.expiringDocuments}{" "}
									expiring ·{" "}
									{snapshot.compliance.summary.outstandingAcknowledgements}{" "}
									acknowledgements outstanding
								</AlertDescription>
							</Alert>
						) : null}
						<div className="grid gap-6 lg:grid-cols-2">
							{permissions.canViewDocuments ? (
								<Card>
									<CardHeader>
										<CardTitle>Documents</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{snapshot.compliance.documents.length > 0 ? (
											snapshot.compliance.documents.map((document) => (
												<div
													key={document.id}
													className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0"
												>
													<div className="flex items-center justify-between gap-4">
														<p className="text-sm font-medium">
															{document.type}
														</p>
														{statusLabel(document.status)}
													</div>
													<p className="text-sm text-foreground-secondary">
														Issued{" "}
														{formatHrLocalDate(document.issuedOn, preferences)}
														{document.expiresOn
															? ` · expires ${formatHrLocalDate(document.expiresOn, preferences)}`
															: ""}
													</p>
												</div>
											))
										) : (
											<Empty size="sm" title="No employee documents" />
										)}
									</CardContent>
								</Card>
							) : null}
							{permissions.canViewAcknowledgements ? (
								<Card>
									<CardHeader>
										<CardTitle>Policy acknowledgements</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{snapshot.compliance.acknowledgements.length > 0 ? (
											snapshot.compliance.acknowledgements.map(
												(acknowledgement) => (
													<div
														key={acknowledgement.id}
														className="space-y-3 border-b border-border pb-4 last:border-0 last:pb-0"
													>
														<p className="text-sm font-medium">
															{acknowledgement.policyCode} · version{" "}
															{acknowledgement.policyVersion}
														</p>
														<p className="text-sm text-foreground-secondary">
															Due{" "}
															{formatHrLocalDate(
																acknowledgement.dueOn,
																preferences,
															)}
														</p>
														{permissions.canAcknowledgePolicy ? (
															<PolicyAcknowledgementForm
																acknowledgement={acknowledgement}
															/>
														) : null}
													</div>
												),
											)
										) : (
											<Empty
												size="sm"
												title="No outstanding acknowledgements"
											/>
										)}
									</CardContent>
								</Card>
							) : null}
						</div>
					</TabsContent>
				) : null}
			</Tabs>
		</section>
	);
}
