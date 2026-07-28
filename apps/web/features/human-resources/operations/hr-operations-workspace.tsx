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
	CaseOpenForm,
	ComplianceScanForm,
	OffboardingLaunchForm,
	OnboardingLaunchForm,
	TerminationLaunchForm,
	TransferLaunchForm,
	WorkforcePlanCreateForm,
} from "./hr-operations-journey-forms";
import type { HrOperationsCapabilities, HrOperationsData } from "./types";

function ErrorNotice({ message }: { message?: string }) {
	return message ? (
		<Alert variant="destructive" role="alert">
			<AlertTitle>Operations data unavailable</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	) : null;
}

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

function defaultTab(capabilities: HrOperationsCapabilities) {
	if (
		capabilities.canOnboard ||
		capabilities.canOffboard ||
		capabilities.canManageEmployment
	)
		return "lifecycle";
	if (capabilities.canAdministerCompliance) return "compliance";
	if (capabilities.canOpenCases || capabilities.canReadCases) return "cases";
	if (
		capabilities.canPrepareWorkforcePlans ||
		capabilities.canReadWorkforcePlans
	)
		return "planning";
	return "integration";
}

export function HrOperationsWorkspace({
	capabilities,
	data,
	integrationHealth,
}: {
	capabilities: HrOperationsCapabilities;
	data: HrOperationsData;
	integrationHealth: ReactNode;
}) {
	const hasLifecycle =
		capabilities.canOnboard ||
		capabilities.canOffboard ||
		capabilities.canManageEmployment;
	const hasCases = capabilities.canOpenCases || capabilities.canReadCases;
	const hasPlanning =
		capabilities.canPrepareWorkforcePlans || capabilities.canReadWorkforcePlans;
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
			<header className="space-y-2">
				<div className="flex flex-wrap gap-2">
					<Badge variant="outline">HR operations</Badge>
					<Badge variant="secondary">Permission-scoped</Badge>
				</div>
				<h1 className="text-2xl font-semibold tracking-normal">
					HR operations workspace
				</h1>
				<p className="max-w-3xl text-sm text-muted-foreground">
					Run controlled employee lifecycle, compliance, employee-relations, and
					workforce-planning journeys.
				</p>
			</header>
			<Tabs defaultValue={defaultTab(capabilities)}>
				<div className="overflow-x-auto pb-1">
					<TabsList variant="line" aria-label="HR operations areas">
						{hasLifecycle ? (
							<TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
						) : null}
						{capabilities.canAdministerCompliance ? (
							<TabsTrigger value="compliance">Compliance</TabsTrigger>
						) : null}
						{hasCases ? (
							<TabsTrigger value="cases">Employee relations</TabsTrigger>
						) : null}
						{hasPlanning ? (
							<TabsTrigger value="planning">Workforce planning</TabsTrigger>
						) : null}
						{integrationHealth ? (
							<TabsTrigger value="integration">Integration health</TabsTrigger>
						) : null}
					</TabsList>
				</div>
				{hasLifecycle ? (
					<TabsContent
						value="lifecycle"
						className="grid gap-4 pt-4 lg:grid-cols-2"
					>
						{capabilities.canOnboard ? (
							<JourneyCard
								title="Onboarding"
								description="Launch the canonical onboarding workflow for an employment record."
							>
								<OnboardingLaunchForm />
							</JourneyCard>
						) : null}
						{capabilities.canManageEmployment ? (
							<JourneyCard
								title="Assignment transfer"
								description="Move an active employment assignment through the controlled transfer journey."
							>
								<TransferLaunchForm />
							</JourneyCard>
						) : null}
						{capabilities.canManageEmployment ? (
							<JourneyCard
								title="Termination proposal"
								description="Propose an employment termination for downstream review and execution."
							>
								<TerminationLaunchForm />
							</JourneyCard>
						) : null}
						{capabilities.canOffboard ? (
							<JourneyCard
								title="Offboarding"
								description="Launch the canonical offboarding workflow for an employment record."
							>
								<OffboardingLaunchForm />
							</JourneyCard>
						) : null}
					</TabsContent>
				) : null}
				{capabilities.canAdministerCompliance ? (
					<TabsContent value="compliance" className="space-y-4 pt-4">
						<ErrorNotice message={data.errors.compliance} />
						<JourneyCard
							title="Compliance expiry operations"
							description="Detect upcoming document and work-eligibility risks using the existing compliance operation."
						>
							<ComplianceScanForm />
						</JourneyCard>
						<div className="grid gap-4 lg:grid-cols-2">
							<RequirementTable requirements={data.missingRequirements} />
							<DocumentTable
								title="Expiring documents"
								documents={data.expiringDocuments}
							/>
						</div>
					</TabsContent>
				) : null}
				{hasCases ? (
					<TabsContent value="cases" className="space-y-4 pt-4">
						<ErrorNotice message={data.errors.cases} />
						{capabilities.canOpenCases ? (
							<JourneyCard
								title="Open employee case"
								description="Create a permission-controlled employee-relations case."
							>
								<CaseOpenForm />
							</JourneyCard>
						) : null}
						{capabilities.canReadCases ? (
							<CaseTable cases={data.cases} />
						) : null}
					</TabsContent>
				) : null}
				{hasPlanning ? (
					<TabsContent value="planning" className="space-y-4 pt-4">
						<ErrorNotice message={data.errors.plans} />
						{capabilities.canPrepareWorkforcePlans ? (
							<JourneyCard
								title="Prepare workforce plan"
								description="Create a draft headcount plan in the canonical planning domain."
							>
								<WorkforcePlanCreateForm />
							</JourneyCard>
						) : null}
						{capabilities.canReadWorkforcePlans ? (
							<PlanTable plans={data.plans} />
						) : null}
					</TabsContent>
				) : null}
				{integrationHealth ? (
					<TabsContent value="integration" className="pt-4">
						{integrationHealth}
					</TabsContent>
				) : null}
			</Tabs>
		</main>
	);
}

function DocumentTable({
	title,
	documents,
}: {
	title: string;
	documents: HrOperationsData["expiringDocuments"];
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>
					{documents.length} records require operational review.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{documents.length === 0 ? (
					<Empty size="sm" title={`No ${title.toLowerCase()}`} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Employee</TableHead>
								<TableHead>Document</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Expires</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{documents.map((document) => (
								<TableRow key={document.id}>
									<TableCell>{document.employeeId}</TableCell>
									<TableCell>{document.documentType}</TableCell>
									<TableCell>{document.verificationStatus}</TableCell>
									<TableCell>{document.expiresOn ?? "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

function RequirementTable({
	requirements,
}: {
	requirements: HrOperationsData["missingRequirements"];
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Missing required documents</CardTitle>
				<CardDescription>
					{requirements.length} published requirements need operational review.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{requirements.length === 0 ? (
					<Empty size="sm" title="No missing required documents" />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Code</TableHead>
								<TableHead>Requirement</TableHead>
								<TableHead>Document type</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{requirements.map((requirement) => (
								<TableRow key={requirement.id}>
									<TableCell>{requirement.code}</TableCell>
									<TableCell>{requirement.name}</TableCell>
									<TableCell>{requirement.documentType}</TableCell>
									<TableCell>{requirement.status}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

function CaseTable({ cases }: { cases: HrOperationsData["cases"] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Open employee cases</CardTitle>
				<CardDescription>
					Cases visible through the assigned-case permission boundary.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{cases.length === 0 ? (
					<Empty size="sm" title="No open employee cases" />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Case</TableHead>
								<TableHead>Employee</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Severity</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{cases.map((employeeCase, index) => (
								<TableRow key={employeeCase.id ?? `case-${index}`}>
									<TableCell>{employeeCase.id ?? "—"}</TableCell>
									<TableCell>{employeeCase.employeeId ?? "—"}</TableCell>
									<TableCell>{employeeCase.caseType ?? "—"}</TableCell>
									<TableCell>{employeeCase.severity ?? "—"}</TableCell>
									<TableCell>{employeeCase.status ?? "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

function PlanTable({ plans }: { plans: HrOperationsData["plans"] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Workforce plans</CardTitle>
				<CardDescription>
					Current plans visible to this operator.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{plans.length === 0 ? (
					<Empty size="sm" title="No workforce plans" />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Code</TableHead>
								<TableHead>Title</TableHead>
								<TableHead>Period</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{plans.map((plan) => (
								<TableRow key={plan.id}>
									<TableCell>{plan.code}</TableCell>
									<TableCell>{plan.title}</TableCell>
									<TableCell>
										{plan.periodStart} – {plan.periodEnd}
									</TableCell>
									<TableCell>{plan.status}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
