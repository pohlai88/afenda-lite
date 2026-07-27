import { requireRole } from "@afenda/auth";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Empty,
	KeyValueList,
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
import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePermission } from "@/features/auth/require-permission";
import {
	AssignmentJourneyForm,
	EmploymentJourneyForm,
	EmploymentLifecycleJourneyForm,
	OffboardingJourneyForm,
	OnboardingJourneyForm,
} from "@/features/human-resources/admin/journey-forms";
import { loadEmployeeAdminRecord } from "@/features/human-resources/admin/employee-record-data";
import type { HrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { formatHrInstant } from "@/features/human-resources/display-preferences";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

function statusTone(status: string): "success" | "pending" | "error" | "warning" | "inactive" | "active" {
	if (["active", "verified", "completed", "passed", "acknowledged"].includes(status)) return "success";
	if (["notice", "pending", "open", "proposed"].includes(status)) return "warning";
	if (["terminated", "expired", "rejected", "failed"].includes(status)) return "error";
	return "inactive";
}

function DateValue({ value }: { value: Date | string | null }) {
	return value ? <>{typeof value === "string" ? value : value.toISOString().slice(0, 10)}</> : <>Not set</>;
}

export async function EmployeeAdminDetail({
	employeeId,
	preferences,
}: {
	employeeId: HumanResourcesEmployeeId;
	preferences: HrDisplayPreferences;
}) {
	const session = await requireRole("operator");
	await requirePermission(session, "human-resources.employee.read");
	const asOf = new Date().toISOString().slice(0, 10);
	const [record, canManageEmployment, canManageOnboarding, canManageOffboarding] = await Promise.all([
		loadEmployeeAdminRecord({ session, employeeId, asOf }),
		sessionHasPermission(session, "human-resources.employment.manage"),
		sessionHasPermission(session, "human-resources.onboarding.manage"),
		sessionHasPermission(session, "human-resources.offboarding.manage"),
	]);
	if (!record.ok && record.code === "NOT_FOUND") notFound();
	if (!record.ok) {
		return (
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
				<h1 className="text-2xl font-semibold">Employee record</h1>
				<Alert variant="destructive" role="alert">
					<AlertTitle>Employee record unavailable</AlertTitle>
					<AlertDescription>Retry or contact HR support.</AlertDescription>
				</Alert>
			</main>
		);
	}

	const data = record.data;
	const employmentContext = data.currentEmployment
		? {
				employeeId: data.employee.id,
				employmentId: data.currentEmployment.id,
				employmentStatus: data.currentEmployment.status,
				employmentVersion: data.currentEmployment.version,
			}
		: null;

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
			<header className="space-y-3">
				<Button asChild variant="ghost" size="sm">
					<Link href="/admin/human-resources">Back to employee directory</Link>
				</Button>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<p className="text-sm text-muted-foreground">{data.employee.employeeNumber}</p>
						<h1 className="text-2xl font-semibold">{data.employee.legalName}</h1>
						<p className="text-sm text-muted-foreground">Employee record as of {asOf}</p>
					</div>
					<StatusBadge status={statusTone(data.currentEmployment?.status ?? "inactive")}>
						{data.currentEmployment?.status ?? "No current employment"}
					</StatusBadge>
				</div>
			</header>

			{data.warnings.map((warning) => (
				<Alert key={warning} role="status">
					<AlertTitle>Partial record</AlertTitle>
					<AlertDescription>{warning}</AlertDescription>
				</Alert>
			))}

			<Tabs defaultValue="overview">
				<div className="overflow-x-auto">
					<TabsList variant="line" aria-label="Employee record areas">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="employment">Employment</TabsTrigger>
						<TabsTrigger value="organization">Organization</TabsTrigger>
						<TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
						<TabsTrigger value="compliance">Compliance</TabsTrigger>
						<TabsTrigger value="actions">Actions</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="overview" className="pt-5">
					<section aria-labelledby="employee-overview-heading" className="space-y-4">
						<h2 id="employee-overview-heading" className="text-lg font-medium">Record overview</h2>
						<KeyValueList
							className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
							items={[
								{ label: "Employee number", value: data.employee.employeeNumber },
								{ label: "Legal name", value: data.employee.legalName },
								{ label: "Preferred name", value: data.profile?.preferredName ?? "Not set" },
								{ label: "Worker type", value: data.profile?.workerType ?? "Not linked" },
								{ label: "Worker status", value: data.profile?.workerStatus ?? "Not linked" },
								{ label: "Record version", value: data.employee.version },
							]}
						/>
					</section>
				</TabsContent>

				<TabsContent value="employment" className="space-y-6 pt-5">
					<section aria-labelledby="employment-history-heading" className="space-y-3">
						<h2 id="employment-history-heading" className="text-lg font-medium">Employment history</h2>
						<div className="overflow-x-auto rounded-md border">
							<Table><TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Version</TableHead></TableRow></TableHeader>
								<TableBody>{data.employments.map((employment) => <TableRow key={employment.id}><TableCell>{employment.startsOn} to {employment.endsOn ?? "present"}</TableCell><TableCell><StatusBadge status={statusTone(employment.status)}>{employment.status}</StatusBadge></TableCell><TableCell>{employment.version}</TableCell></TableRow>)}</TableBody>
							</Table>
						</div>
					</section>
					<section aria-labelledby="contract-history-heading" className="space-y-3">
						<h2 id="contract-history-heading" className="text-lg font-medium">Contract history</h2>
						{data.contracts.length === 0 ? <Empty size="sm" title="No contracts recorded" /> : (
							<div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader><TableBody>{data.contracts.map((contract) => <TableRow key={contract.id}><TableCell className="font-medium">{contract.referenceCode}</TableCell><TableCell>{contract.startsOn} to {contract.endsOn ?? "present"}</TableCell><TableCell><StatusBadge status={statusTone(contract.lineageStatus)}>{contract.lineageStatus}</StatusBadge></TableCell><TableCell>{contract.reasonCode}</TableCell></TableRow>)}</TableBody></Table></div>
						)}
					</section>
					<section aria-labelledby="assignment-history-heading" className="space-y-3">
						<h2 id="assignment-history-heading" className="text-lg font-medium">Assignment history</h2>
						{data.assignments.length === 0 ? <Empty size="sm" title="No assignments recorded" /> : (
							<div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Position record</TableHead><TableHead>Manager snapshot</TableHead></TableRow></TableHeader><TableBody>{data.assignments.map((assignment) => <TableRow key={assignment.id}><TableCell>{assignment.startsOn} to {assignment.endsOn ?? "present"}</TableCell><TableCell>{assignment.positionId}</TableCell><TableCell>{assignment.managerEmployeeIdSnapshot ?? "Not set"}</TableCell></TableRow>)}</TableBody></Table></div>
						)}
					</section>
				</TabsContent>

				<TabsContent value="organization" className="space-y-6 pt-5">
					<section aria-labelledby="position-context-heading" className="space-y-4">
						<h2 id="position-context-heading" className="text-lg font-medium">Position and reporting context</h2>
						<KeyValueList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" items={[
							{ label: "Position", value: data.position ? `${data.position.code} · ${data.position.title}` : "Not assigned" },
							{ label: "Manager", value: data.manager ? `${data.manager.employeeNumber} · ${data.manager.legalName}` : "Not assigned" },
							{ label: "Legal entity", value: data.orgContext?.legalEntityKey ?? "Not resolved" },
							{ label: "Business unit", value: data.orgContext?.businessUnitKey ?? "Not resolved" },
							{ label: "Location", value: data.orgContext?.locationKey ?? "Not resolved" },
							{ label: "Cost centre", value: data.orgContext?.costCentreKey ?? "Not resolved" },
						]} />
					</section>
					<section aria-labelledby="direct-reports-heading" className="space-y-3">
						<h2 id="direct-reports-heading" className="text-lg font-medium">Direct reports</h2>
						{data.directReports.length === 0 ? <Empty size="sm" title="No direct reports" /> : <ul className="divide-y rounded-md border">{data.directReports.map((employee) => <li key={employee.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span>{employee.employeeNumber} · {employee.legalName}</span><Button asChild variant="ghost" size="sm"><Link href={`/admin/human-resources/employees/${employee.id}`}>Open</Link></Button></li>)}</ul>}
					</section>
				</TabsContent>

				<TabsContent value="lifecycle" className="pt-5">
					<section aria-labelledby="lifecycle-timeline-heading" className="space-y-3">
						<h2 id="lifecycle-timeline-heading" className="text-lg font-medium">Lifecycle timeline</h2>
						{data.timeline.length === 0 ? <Empty title="No lifecycle facts recorded" description="Lifecycle facts will appear as governed operations are completed." /> : (
							<div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Area</TableHead><TableHead>Event</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.timeline.map((entry) => <TableRow key={entry.id}><TableCell>{entry.date}</TableCell><TableCell className="capitalize">{entry.kind}</TableCell><TableCell><div className="font-medium">{entry.title}</div><div className="text-sm text-muted-foreground">{entry.detail}</div></TableCell><TableCell><StatusBadge status={statusTone(entry.status)}>{entry.status}</StatusBadge></TableCell></TableRow>)}</TableBody></Table></div>
						)}
					</section>
				</TabsContent>

				<TabsContent value="compliance" className="space-y-6 pt-5">
					<section aria-labelledby="compliance-summary-heading" className="space-y-4">
						<h2 id="compliance-summary-heading" className="text-lg font-medium">Compliance summary</h2>
						{data.complianceSummary && (data.complianceSummary.missingRequiredDocumentCount > 0 || data.complianceSummary.expiringDocumentCount > 0 || data.complianceSummary.workEligibilityAtRisk || data.complianceSummary.outstandingPolicyAcknowledgementCount > 0) ? (
							<Alert variant="destructive" role="alert"><AlertTitle>Compliance action required</AlertTitle><AlertDescription>Review missing or expiring documents, work eligibility, and outstanding policy acknowledgements.</AlertDescription></Alert>
						) : <Alert role="status"><AlertTitle>No current compliance alerts</AlertTitle><AlertDescription>No missing, expiring, eligibility, or acknowledgement risks were reported.</AlertDescription></Alert>}
						<KeyValueList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" items={[
							{ label: "Missing documents", value: data.complianceSummary?.missingRequiredDocumentCount ?? "Unavailable" },
							{ label: "Expiring documents", value: data.complianceSummary?.expiringDocumentCount ?? "Unavailable" },
							{ label: "Eligibility at risk", value: data.complianceSummary ? (data.complianceSummary.workEligibilityAtRisk ? "Yes" : "No") : "Unavailable" },
							{ label: "Outstanding policies", value: data.complianceSummary?.outstandingPolicyAcknowledgementCount ?? "Unavailable" },
						]} />
					</section>
					<section aria-labelledby="documents-heading" className="space-y-3"><h2 id="documents-heading" className="text-lg font-medium">Documents</h2>{data.documents.length === 0 ? <Empty size="sm" title="No documents recorded" /> : <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Issued</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.documents.map((document) => <TableRow key={document.id}><TableCell>{document.documentType}</TableCell><TableCell>{document.issuedOn}</TableCell><TableCell><DateValue value={document.expiresOn} /></TableCell><TableCell><StatusBadge status={statusTone(document.verificationStatus)}>{document.verificationStatus}</StatusBadge></TableCell></TableRow>)}</TableBody></Table></div>}</section>
					<section aria-labelledby="eligibility-heading" className="space-y-3"><h2 id="eligibility-heading" className="text-lg font-medium">Work eligibility</h2>{data.workEligibility ? <KeyValueList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" items={[{ label: "Country", value: data.workEligibility.countryCode }, { label: "Status", value: data.workEligibility.status }, { label: "Issued", value: data.workEligibility.issuedOn }, { label: "Expires", value: data.workEligibility.expiresOn ?? "Not set" }]} /> : <Empty size="sm" title="No active work eligibility record" />}</section>
					<section aria-labelledby="acknowledgements-heading" className="space-y-3"><h2 id="acknowledgements-heading" className="text-lg font-medium">Outstanding acknowledgements</h2>{data.outstandingAcknowledgements.length === 0 ? <Empty size="sm" title="No outstanding acknowledgements" /> : <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Policy</TableHead><TableHead>Version</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.outstandingAcknowledgements.map((acknowledgement) => <TableRow key={acknowledgement.id}><TableCell>{acknowledgement.policyCode}</TableCell><TableCell>{acknowledgement.policyVersion}</TableCell><TableCell>{acknowledgement.dueOn}</TableCell><TableCell><StatusBadge status={statusTone(acknowledgement.requirementStatus)}>{acknowledgement.requirementStatus}</StatusBadge></TableCell></TableRow>)}</TableBody></Table></div>}</section>
				</TabsContent>

				<TabsContent value="actions" className="space-y-8 pt-5">
					<section aria-labelledby="employment-actions-heading" className="space-y-4"><h2 id="employment-actions-heading" className="text-lg font-medium">Employment transition</h2><EmploymentJourneyForm employeeId={data.employee.id} employment={employmentContext} canManage={canManageEmployment} /></section>
					{employmentContext ? <>
						<section aria-labelledby="assignment-actions-heading" className="space-y-4 border-t pt-6"><h2 id="assignment-actions-heading" className="text-lg font-medium">Assignment transition</h2><AssignmentJourneyForm context={employmentContext} assignment={data.currentAssignment ? { id: data.currentAssignment.id, version: data.currentAssignment.version } : null} positions={data.availablePositions.filter((position) => position.id !== data.currentAssignment?.positionId).map((position) => ({ id: position.id, code: position.code, title: position.title }))} canManage={canManageEmployment} /></section>
						{canManageEmployment ? <section aria-labelledby="lifecycle-actions-heading" className="space-y-4 border-t pt-6"><h2 id="lifecycle-actions-heading" className="text-lg font-medium">Probation and termination</h2><EmploymentLifecycleJourneyForm context={employmentContext} /></section> : null}
						{canManageOnboarding ? <section aria-labelledby="onboarding-actions-heading" className="space-y-4 border-t pt-6"><h2 id="onboarding-actions-heading" className="text-lg font-medium">Onboarding</h2><OnboardingJourneyForm context={employmentContext} /></section> : null}
						{canManageOffboarding ? <section aria-labelledby="offboarding-actions-heading" className="space-y-4 border-t pt-6"><h2 id="offboarding-actions-heading" className="text-lg font-medium">Offboarding</h2><OffboardingJourneyForm context={employmentContext} /></section> : null}
					</> : null}
				</TabsContent>
			</Tabs>
		</main>
	);
}
