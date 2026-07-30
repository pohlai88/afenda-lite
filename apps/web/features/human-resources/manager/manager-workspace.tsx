// biome-ignore-all lint/style/noNestedTernary: Exhaustive status and tri-state view mappings remain explicit at their use sites.
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
import {
	formatHrLocalDate,
	type HrDisplayPreferences,
} from "../display-preferences";
import { ManagerDecisionDialog } from "./manager-decision-dialog";
import {
	type ManagerWorkspaceData,
	managerStatusTone,
} from "./manager-workspace-model";

function EmptyQueue({ title }: { title: string }) {
	return (
		<Empty
			description="There are no items in this manager-scoped queue."
			icon={<InboxIcon />}
			size="sm"
			title={title}
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Capability branches intentionally map independent manager workflows.
export function ManagerWorkspace({
	data,
	preferences,
}: {
	data: ManagerWorkspaceData;
	preferences: HrDisplayPreferences;
}) {
	const asOfLabel = formatHrLocalDate(data.asOf, preferences);
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
			<header className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">Manager self-service</Badge>
					<Badge variant="secondary">{data.team.length} direct reports</Badge>
				</div>
				<h1 className="font-semibold text-2xl text-foreground tracking-normal">
					Team decisions
				</h1>
				<p className="max-w-3xl text-muted-foreground text-sm">
					Review current team work queues, employee context, talent readiness,
					and staffing gaps as of {asOfLabel}.
				</p>
			</header>
			{data.errors.length > 0 ? (
				<Alert role="alert" variant="destructive">
					<AlertTitle>Some manager data could not be loaded</AlertTitle>
					<AlertDescription>{data.errors.join(" ")}</AlertDescription>
				</Alert>
			) : null}
			<Tabs className="min-w-0" defaultValue="team">
				<div className="overflow-x-auto pb-1">
					<TabsList aria-label="Manager work queues" variant="line">
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
				<TabsContent className="pt-4" value="team">
					{data.team.length === 0 ? (
						<Empty
							description="No effective primary reporting lines were found for this manager."
							icon={<UsersIcon />}
							size="sm"
							title="No direct reports"
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
												label={member.employmentStatus ?? "No employment"}
												status={managerStatusTone(
													member.employmentStatus ?? "inactive",
												)}
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
				<TabsContent className="pt-4" value="leave">
					{data.capabilities.leave ? (
						data.leave.length === 0 ? (
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
													label={row.status}
													status={managerStatusTone(row.status)}
												/>
											</TableCell>
											<TableCell>
												<ManagerDecisionDialog
													asOf={data.asOf}
													kind="leave"
													label={`Leave decision for ${row.displayName}`}
													targetId={row.id}
													version={row.version}
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)
					) : (
						<Unavailable />
					)}
				</TabsContent>
				<TabsContent className="pt-4" value="timesheets">
					{data.capabilities.timesheets ? (
						data.timesheets.length === 0 ? (
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
													label={row.status}
													status={managerStatusTone(row.status)}
												/>
											</TableCell>
											<TableCell>
												<ManagerDecisionDialog
													asOf={data.asOf}
													kind="timesheet"
													label={`Timesheet decision for ${row.displayName}`}
													targetId={row.id}
													version={row.version}
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)
					) : (
						<Unavailable />
					)}
				</TabsContent>
				<TabsContent className="pt-4" value="attendance">
					{data.capabilities.attendance ? (
						data.attendance.length === 0 ? (
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
													label={row.severity}
													status={managerStatusTone(row.severity)}
												/>
											</TableCell>
											<TableCell>{row.reviewStatus}</TableCell>
											<TableCell className="max-w-64 whitespace-normal">
												{row.remarks ?? "None"}
											</TableCell>
											<TableCell>
												<ManagerDecisionDialog
													asOf={data.asOf}
													kind="attendance"
													label={`Attendance review for ${row.displayName}`}
													targetId={row.id}
													version={row.version}
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)
					) : (
						<Unavailable />
					)}
				</TabsContent>
				<TabsContent className="pt-4" value="probation">
					{data.capabilities.probation ? (
						data.probation.length === 0 ? (
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
													label={row.status}
													status={managerStatusTone(row.status)}
												/>
											</TableCell>
											<TableCell>{row.outcome ?? "Pending"}</TableCell>
											<TableCell>
												<ManagerDecisionDialog
													asOf={data.asOf}
													kind="probation"
													label={`Probation decision for ${row.displayName}`}
													relatedId={row.employmentId}
													targetId={row.id}
													version={row.version}
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)
					) : (
						<Unavailable />
					)}
				</TabsContent>
				<TabsContent className="space-y-6 pt-4" value="performance">
					{data.capabilities.performance ? (
						<>
							<section aria-labelledby="reviews-heading" className="space-y-3">
								<h2 className="font-semibold text-lg" id="reviews-heading">
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
															label={row.status}
															status={managerStatusTone(row.status)}
														/>
													</TableCell>
													<TableCell>
														{row.overallRating ?? "Pending"}
													</TableCell>
													<TableCell>
														<ManagerDecisionDialog
															asOf={data.asOf}
															kind="performance-review"
															label={`Performance review for ${row.displayName}`}
															targetId={row.id}
															version={row.version}
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</section>
							<section aria-labelledby="goals-heading" className="space-y-3">
								<h2 className="font-semibold text-lg" id="goals-heading">
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
															asOf={data.asOf}
															kind="performance-goal"
															label={`Goal decision for ${row.displayName}`}
															targetId={row.id}
															version={row.version}
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</section>
						</>
					) : (
						<Unavailable />
					)}
				</TabsContent>
				<TabsContent className="space-y-6 pt-4" value="talent">
					{data.capabilities.talent || data.capabilities.succession ? (
						<>
							<section aria-labelledby="talent-heading" className="space-y-3">
								<h2 className="font-semibold text-lg" id="talent-heading">
									Talent profiles
								</h2>
								{data.capabilities.talent ? (
									data.talent.length === 0 ? (
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
																label={row.status}
																status={managerStatusTone(row.status)}
															/>
														</TableCell>
														<TableCell>
															<ManagerDecisionDialog
																asOf={data.asOf}
																employeeId={row.employeeId}
																kind="talent"
																label={`Talent assessment for ${row.displayName}`}
																targetId={row.id}
																version={row.version}
															/>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									)
								) : (
									<Unavailable />
								)}
							</section>
							<section
								aria-labelledby="succession-heading"
								className="space-y-3"
							>
								<h2 className="font-semibold text-lg" id="succession-heading">
									Succession readiness
								</h2>
								{data.capabilities.succession ? (
									data.succession.length === 0 ? (
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
																label={row.readiness ?? "Restricted"}
																status={managerStatusTone(
																	row.readiness ?? "restricted",
																)}
															/>
														</TableCell>
														<TableCell>{row.status}</TableCell>
														<TableCell>
															<ManagerDecisionDialog
																asOf={data.asOf}
																employeeId={row.employeeId}
																kind="succession"
																label={`Succession readiness for ${row.displayName}`}
																relatedId={row.planId}
																targetId={row.id}
																version={row.version}
															/>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									)
								) : (
									<Unavailable />
								)}
							</section>
						</>
					) : (
						<Unavailable />
					)}
				</TabsContent>
				<TabsContent className="pt-4" value="staffing">
					{data.capabilities.staffing ? (
						data.staffingGaps.length === 0 ? (
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
													label={String(row.varianceHeadcount)}
													status={
														row.varianceHeadcount < 0 ? "error" : "success"
													}
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
						)
					) : (
						<Unavailable />
					)}
				</TabsContent>
			</Tabs>
		</main>
	);
}
