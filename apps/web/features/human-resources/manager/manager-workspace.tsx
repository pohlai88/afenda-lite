"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Empty,
	StatusBadge,
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
import { InboxIcon, UsersIcon } from "lucide-react";

import { ManagerDecisionDialog } from "./manager-decision-dialog";
import {
	type ManagerWorkspaceData,
	managerStatusTone,
} from "./manager-workspace-model";

function EmptyQueue({ title }: { title: string }) {
	return (
		<Empty
			size="sm"
			icon={<InboxIcon />}
			title={title}
			description="There are no items in this manager-scoped queue."
		/>
	);
}

function Unavailable() {
	return (
		<Alert role="status">
			<AlertTitle>Capability unavailable</AlertTitle>
			<AlertDescription>
				Your current organization permissions do not allow this manager journey.
			</AlertDescription>
		</Alert>
	);
}

export function ManagerWorkspace({ data }: { data: ManagerWorkspaceData }) {
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
			<header className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">Manager self-service</Badge>
					<Badge variant="secondary">{data.team.length} direct reports</Badge>
				</div>
				<h1 className="text-2xl font-semibold tracking-normal text-foreground">
					Team decisions
				</h1>
				<p className="max-w-3xl text-sm text-muted-foreground">
					Review current team work queues, employee context, talent readiness,
					and staffing gaps as of {data.asOf}.
				</p>
			</header>
			{data.errors.length > 0 ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>Some manager data could not be loaded</AlertTitle>
					<AlertDescription>{data.errors.join(" ")}</AlertDescription>
				</Alert>
			) : null}
			<Tabs defaultValue="team" className="min-w-0">
				<div className="overflow-x-auto pb-1">
					<TabsList variant="line" aria-label="Manager work queues">
						<TabsTrigger value="team">Team</TabsTrigger>
						<TabsTrigger value="leave">Leave</TabsTrigger>
						<TabsTrigger value="timesheets">Timesheets</TabsTrigger>
						<TabsTrigger value="attendance">Attendance</TabsTrigger>
						<TabsTrigger value="probation">Probation</TabsTrigger>
						<TabsTrigger value="performance">Performance</TabsTrigger>
						<TabsTrigger value="talent">Talent</TabsTrigger>
						<TabsTrigger value="staffing">Staffing</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="team" className="pt-4">
					{data.team.length === 0 ? (
						<Empty
							size="sm"
							icon={<UsersIcon />}
							title="No direct reports"
							description="No effective primary reporting lines were found for this manager."
						/>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Employee no.</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Business unit</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.team.map((member) => (
									<TableRow key={member.employeeId}>
										<TableCell className="font-medium">
											{member.displayName}
										</TableCell>
										<TableCell>{member.employeeNumber}</TableCell>
										<TableCell>
											<StatusBadge
												status={managerStatusTone(
													member.employmentStatus ?? "inactive",
												)}
												label={member.employmentStatus ?? "No employment"}
											/>
										</TableCell>
										<TableCell>{member.departmentId ?? "Unassigned"}</TableCell>
										<TableCell>{member.locationKey ?? "Unassigned"}</TableCell>
										<TableCell>
											{member.businessUnitKey ?? "Unassigned"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TabsContent>
				<TabsContent value="leave" className="pt-4">
					{!data.capabilities.leave ? (
						<Unavailable />
					) : data.leave.length === 0 ? (
						<EmptyQueue title="No pending leave decisions" />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Dates</TableHead>
									<TableHead>Quantity</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.leave.map((row) => (
									<TableRow key={row.id}>
										<TableCell className="font-medium">
											{row.displayName}
										</TableCell>
										<TableCell>
											{row.startDate} to {row.endDate}
										</TableCell>
										<TableCell>
											{row.requestedQuantity} {row.unit}
										</TableCell>
										<TableCell>
											<StatusBadge
												status={managerStatusTone(row.status)}
												label={row.status}
											/>
										</TableCell>
										<TableCell>
											<ManagerDecisionDialog
												kind="leave"
												targetId={row.id}
												version={row.version}
												label={`Leave decision for ${row.displayName}`}
												asOf={data.asOf}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TabsContent>
				<TabsContent value="timesheets" className="pt-4">
					{!data.capabilities.timesheets ? (
						<Unavailable />
					) : data.timesheets.length === 0 ? (
						<EmptyQueue title="No submitted timesheets" />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Period</TableHead>
									<TableHead>Recorded</TableHead>
									<TableHead>Approval step</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.timesheets.map((row) => (
									<TableRow key={row.id}>
										<TableCell className="font-medium">
											{row.displayName}
										</TableCell>
										<TableCell>
											{row.periodStart} to {row.periodEnd}
										</TableCell>
										<TableCell>{row.totalRecordedMinutes} min</TableCell>
										<TableCell>
											{row.completedApprovalSteps + 1} of{" "}
											{row.requiredApprovalSteps}
										</TableCell>
										<TableCell>
											<StatusBadge
												status={managerStatusTone(row.status)}
												label={row.status}
											/>
										</TableCell>
										<TableCell>
											<ManagerDecisionDialog
												kind="timesheet"
												targetId={row.id}
												version={row.version}
												label={`Timesheet decision for ${row.displayName}`}
												asOf={data.asOf}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TabsContent>
				<TabsContent value="attendance" className="pt-4">
					{!data.capabilities.attendance ? (
						<Unavailable />
					) : data.attendance.length === 0 ? (
						<EmptyQueue title="No attendance exceptions" />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Exception</TableHead>
									<TableHead>Severity</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Remarks</TableHead>
									<TableHead>Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.attendance.map((row) => (
									<TableRow key={row.id}>
										<TableCell className="font-medium">
											{row.displayName}
										</TableCell>
										<TableCell>{row.exceptionType}</TableCell>
										<TableCell>
											<StatusBadge
												status={managerStatusTone(row.severity)}
												label={row.severity}
											/>
										</TableCell>
										<TableCell>{row.reviewStatus}</TableCell>
										<TableCell className="max-w-64 whitespace-normal">
											{row.remarks ?? "None"}
										</TableCell>
										<TableCell>
											<ManagerDecisionDialog
												kind="attendance"
												targetId={row.id}
												version={row.version}
												label={`Attendance review for ${row.displayName}`}
												asOf={data.asOf}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TabsContent>
				<TabsContent value="probation" className="pt-4">
					{!data.capabilities.probation ? (
						<Unavailable />
					) : data.probation.length === 0 ? (
						<EmptyQueue title="No probation or confirmation decisions" />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Employee</TableHead>
									<TableHead>Period</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Outcome</TableHead>
									<TableHead>Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.probation.map((row) => (
									<TableRow key={row.id}>
										<TableCell className="font-medium">
											{row.displayName}
										</TableCell>
										<TableCell>
											{row.startsOn} to {row.endsOn}
										</TableCell>
										<TableCell>
											<StatusBadge
												status={managerStatusTone(row.status)}
												label={row.status}
											/>
										</TableCell>
										<TableCell>{row.outcome ?? "Pending"}</TableCell>
										<TableCell>
											<ManagerDecisionDialog
												kind="probation"
												targetId={row.id}
												relatedId={row.employmentId}
												version={row.version}
												label={`Probation decision for ${row.displayName}`}
												asOf={data.asOf}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TabsContent>
				<TabsContent value="performance" className="space-y-6 pt-4">
					{!data.capabilities.performance ? (
						<Unavailable />
					) : (
						<>
							<section aria-labelledby="reviews-heading" className="space-y-3">
								<h2 id="reviews-heading" className="text-lg font-semibold">
									Review decisions
								</h2>
								{data.performanceReviews.length === 0 ? (
									<EmptyQueue title="No performance reviews awaiting action" />
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Employee</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Rating</TableHead>
												<TableHead>Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.performanceReviews.map((row) => (
												<TableRow key={row.id}>
													<TableCell className="font-medium">
														{row.displayName}
													</TableCell>
													<TableCell>
														<StatusBadge
															status={managerStatusTone(row.status)}
															label={row.status}
														/>
													</TableCell>
													<TableCell>
														{row.overallRating ?? "Pending"}
													</TableCell>
													<TableCell>
														<ManagerDecisionDialog
															kind="performance-review"
															targetId={row.id}
															version={row.version}
															label={`Performance review for ${row.displayName}`}
															asOf={data.asOf}
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</section>
							<section aria-labelledby="goals-heading" className="space-y-3">
								<h2 id="goals-heading" className="text-lg font-semibold">
									Goal decisions
								</h2>
								{data.goals.length === 0 ? (
									<EmptyQueue title="No submitted goals" />
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Employee</TableHead>
												<TableHead>Goal</TableHead>
												<TableHead>Due</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.goals.map((row) => (
												<TableRow key={row.id}>
													<TableCell className="font-medium">
														{row.displayName}
													</TableCell>
													<TableCell className="max-w-80 whitespace-normal">
														{row.title}
													</TableCell>
													<TableCell>{row.periodEnd}</TableCell>
													<TableCell>{row.status}</TableCell>
													<TableCell>
														<ManagerDecisionDialog
															kind="performance-goal"
															targetId={row.id}
															version={row.version}
															label={`Goal decision for ${row.displayName}`}
															asOf={data.asOf}
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</section>
						</>
					)}
				</TabsContent>
				<TabsContent value="talent" className="space-y-6 pt-4">
					{!data.capabilities.talent && !data.capabilities.succession ? (
						<Unavailable />
					) : (
						<>
							<section aria-labelledby="talent-heading" className="space-y-3">
								<h2 id="talent-heading" className="text-lg font-semibold">
									Talent profiles
								</h2>
								{!data.capabilities.talent ? (
									<Unavailable />
								) : data.talent.length === 0 ? (
									<EmptyQueue title="No scoped talent profiles" />
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Employee</TableHead>
												<TableHead>Classification</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.talent.map((row) => (
												<TableRow key={row.id}>
													<TableCell className="font-medium">
														{row.displayName}
													</TableCell>
													<TableCell>
														{row.classification ?? "Not classified"}
													</TableCell>
													<TableCell>
														<StatusBadge
															status={managerStatusTone(row.status)}
															label={row.status}
														/>
													</TableCell>
													<TableCell>
														<ManagerDecisionDialog
															kind="talent"
															targetId={row.id}
															employeeId={row.employeeId}
															version={row.version}
															label={`Talent assessment for ${row.displayName}`}
															asOf={data.asOf}
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</section>
							<section
								aria-labelledby="succession-heading"
								className="space-y-3"
							>
								<h2 id="succession-heading" className="text-lg font-semibold">
									Succession readiness
								</h2>
								{!data.capabilities.succession ? (
									<Unavailable />
								) : data.succession.length === 0 ? (
									<EmptyQueue title="No scoped succession candidates" />
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Employee</TableHead>
												<TableHead>Plan</TableHead>
												<TableHead>Readiness</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.succession.map((row) => (
												<TableRow key={row.id}>
													<TableCell className="font-medium">
														{row.displayName}
													</TableCell>
													<TableCell>{row.planTitle}</TableCell>
													<TableCell>
														<StatusBadge
															status={managerStatusTone(
																row.readiness ?? "restricted",
															)}
															label={row.readiness ?? "Restricted"}
														/>
													</TableCell>
													<TableCell>{row.status}</TableCell>
													<TableCell>
														<ManagerDecisionDialog
															kind="succession"
															targetId={row.id}
															employeeId={row.employeeId}
															relatedId={row.planId}
															version={row.version}
															label={`Succession readiness for ${row.displayName}`}
															asOf={data.asOf}
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</section>
						</>
					)}
				</TabsContent>
				<TabsContent value="staffing" className="pt-4">
					{!data.capabilities.staffing ? (
						<Unavailable />
					) : data.staffingGaps.length === 0 ? (
						<EmptyQueue title="No scoped staffing gaps" />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Plan</TableHead>
									<TableHead>Scope</TableHead>
									<TableHead>Actual / planned</TableHead>
									<TableHead>Headcount variance</TableHead>
									<TableHead>FTE variance</TableHead>
									<TableHead>Available</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.staffingGaps.map((row) => (
									<TableRow key={`${row.planId}-${row.planLineId}`}>
										<TableCell className="font-medium">
											{row.planTitle}
										</TableCell>
										<TableCell>{row.planningScopeKey}</TableCell>
										<TableCell>
											{row.actualHeadcount} / {row.plannedHeadcount}
										</TableCell>
										<TableCell>
											<StatusBadge
												status={row.varianceHeadcount < 0 ? "error" : "success"}
												label={String(row.varianceHeadcount)}
											/>
										</TableCell>
										<TableCell>{row.varianceFte}</TableCell>
										<TableCell>
											{row.availableHeadcount} ({row.availableFte} FTE)
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TabsContent>
			</Tabs>
		</main>
	);
}
