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
import type { ReactNode } from "react";
import {
	BenefitPlanCreateForm,
	EmployeeCompensationLookup,
	GradeCreateForm,
	PayrollHandoffLookup,
	ReviewCycleCreateForm,
	SalaryBandCreateForm,
} from "./compensation-journey-forms";
import type {
	CompensationCapabilities,
	CompensationWorkspaceData,
} from "./types";

function JourneyCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function LoadError({ message }: { message?: string | undefined }) {
	return message ? (
		<Alert variant="destructive">
			<AlertTitle>Compensation data unavailable</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	) : null;
}

export function CompensationWorkspace({
	capabilities,
	data,
}: {
	capabilities: CompensationCapabilities;
	data: CompensationWorkspaceData;
}) {
	const canCompensation = capabilities.canRead || capabilities.canManage;
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
			<header className="space-y-2">
				<div className="flex flex-wrap gap-2">
					<Badge variant="outline">Compensation</Badge>
					<Badge variant="secondary">Sensitive · permission-scoped</Badge>
				</div>
				<h1 className="font-semibold text-2xl tracking-normal">
					Compensation and benefits workspace
				</h1>
				<p className="max-w-3xl text-muted-foreground text-sm">
					Manage compensation structures, controlled review cycles, benefits,
					employee history, and approved payroll delivery status.
				</p>
			</header>
			<Tabs defaultValue={canCompensation ? "grades" : "benefits"}>
				<div className="overflow-x-auto pb-1">
					<TabsList aria-label="Compensation workspace areas" variant="line">
						{canCompensation ? (
							<>
								<TabsTrigger value="grades">Grades</TabsTrigger>
								<TabsTrigger value="bands">Bands</TabsTrigger>
								<TabsTrigger value="reviews">Reviews</TabsTrigger>
								<TabsTrigger value="history">Employee history</TabsTrigger>
								<TabsTrigger value="payroll">Payroll handoff</TabsTrigger>
							</>
						) : null}
						{capabilities.canManageBenefits ? (
							<TabsTrigger value="benefits">Benefits</TabsTrigger>
						) : null}
					</TabsList>
				</div>
				{canCompensation ? (
					<TabsContent className="space-y-4 pt-4" value="grades">
						<LoadError message={data.errors.grades} />
						{capabilities.canManage ? (
							<JourneyCard
								description="Add a grade through the canonical compensation command."
								title="Create compensation grade"
							>
								<GradeCreateForm />
							</JourneyCard>
						) : null}
						<Card>
							<CardHeader>
								<CardTitle>Compensation grades</CardTitle>
								<CardDescription>
									{data.grades.length} grades visible to this operator.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{data.grades.length === 0 ? (
									<Empty size="sm" title="No compensation grades" />
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Code</TableHead>
												<TableHead>Name</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Version</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.grades.map((grade) => (
												<TableRow key={grade.id}>
													<TableCell>{grade.code}</TableCell>
													<TableCell>{grade.name}</TableCell>
													<TableCell>{grade.status}</TableCell>
													<TableCell>{grade.version}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}
				{canCompensation ? (
					<TabsContent className="pt-4" value="bands">
						{capabilities.canManage ? (
							<JourneyCard
								description="Define an effective-dated range with exact decimal amounts."
								title="Create salary band"
							>
								<SalaryBandCreateForm />
							</JourneyCard>
						) : (
							<Empty
								description="Management permission is required to create a salary band."
								size="sm"
								title="Salary bands are read-only"
							/>
						)}
					</TabsContent>
				) : null}
				{canCompensation ? (
					<TabsContent className="space-y-4 pt-4" value="reviews">
						<LoadError message={data.errors.reviews} />
						{capabilities.canManage ? (
							<JourneyCard
								description="Prepare a controlled compensation review budget and period."
								title="Create review cycle"
							>
								<ReviewCycleCreateForm />
							</JourneyCard>
						) : null}
						<Card>
							<CardHeader>
								<CardTitle>Review cycles</CardTitle>
								<CardDescription>
									{data.reviewCycles.length} cycles visible to this operator.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{data.reviewCycles.length === 0 ? (
									<Empty size="sm" title="No compensation review cycles" />
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Code</TableHead>
												<TableHead>Name</TableHead>
												<TableHead>Period</TableHead>
												<TableHead>Budget</TableHead>
												<TableHead>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.reviewCycles.map((cycle) => (
												<TableRow key={cycle.id}>
													<TableCell>{cycle.code}</TableCell>
													<TableCell>{cycle.name}</TableCell>
													<TableCell>
														{cycle.periodStart} – {cycle.periodEnd}
													</TableCell>
													<TableCell>
														{cycle.budgetTotalAmount} {cycle.budgetCurrencyCode}
													</TableCell>
													<TableCell>{cycle.status}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}
				{capabilities.canManageBenefits ? (
					<TabsContent className="pt-4" value="benefits">
						<JourneyCard
							description="Create a benefit plan through the existing benefits action."
							title="Create benefit plan"
						>
							<BenefitPlanCreateForm />
						</JourneyCard>
					</TabsContent>
				) : null}
				{canCompensation ? (
					<TabsContent className="pt-4" value="history">
						<JourneyCard
							description="Load effective-dated compensation records within the current organization."
							title="Employee compensation history"
						>
							<EmployeeCompensationLookup />
						</JourneyCard>
					</TabsContent>
				) : null}
				{canCompensation ? (
					<TabsContent className="pt-4" value="payroll">
						<JourneyCard
							description="Verify the approved compensation and active benefits payload available to payroll."
							title="Payroll handoff delivery status"
						>
							<PayrollHandoffLookup />
						</JourneyCard>
					</TabsContent>
				) : null}
			</Tabs>
		</main>
	);
}
