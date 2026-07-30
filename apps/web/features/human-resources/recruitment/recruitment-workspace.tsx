import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Button,
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
import Link from "next/link";

import {
	CandidateConsentForm,
	HireConversionForm,
	InterviewScheduleForm,
	OfferCreateForm,
	OfferTransitionForm,
	PipelineTransitionForm,
	RequisitionCreateForm,
	RequisitionTransitionForm,
} from "./recruitment-journey-forms";
import type {
	RecruitmentCapabilities,
	RecruitmentWorkspaceData,
} from "./types";

function ErrorNotice({ message }: { message?: string | undefined }) {
	if (!message) {
		return null;
	}
	return (
		<Alert role="alert" variant="destructive">
			<AlertTitle>Recruitment information unavailable</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

function status(value: string) {
	return <Badge variant="outline">{value.replaceAll("_", " ")}</Badge>;
}

function defaultTab(capabilities: RecruitmentCapabilities) {
	if (capabilities.canManageRequisitions) {
		return "requisitions";
	}
	if (capabilities.canManageCandidates) {
		return "pipeline";
	}
	if (capabilities.canReadInterviews) {
		return "interviews";
	}
	return "offers";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Capability branches intentionally map independent recruitment workflows.
export function RecruitmentWorkspace({
	capabilities,
	data,
}: {
	capabilities: RecruitmentCapabilities;
	data: RecruitmentWorkspaceData;
}) {
	const candidates = new Map(data.candidates.map((item) => [item.id, item]));
	const requisitions = new Map(
		data.requisitions.map((item) => [item.id, item]),
	);
	return (
		<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
			<header className="space-y-3">
				<p className="font-medium text-foreground-secondary text-sm">
					Operator · Human resources
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					Recruitment workspace
				</h1>
				<p className="max-w-3xl text-foreground-secondary text-sm">
					Manage requisitions, candidate progression, interviews, offers,
					consent, and accepted-offer conversion within the current
					organization.
				</p>
				{capabilities.canManageCandidates ? (
					<Button asChild variant="outline">
						<Link href="/admin/human-resources/candidates">
							Open candidate directory
						</Link>
					</Button>
				) : null}
			</header>

			<Tabs className="space-y-6" defaultValue={defaultTab(capabilities)}>
				<TabsList className="h-auto flex-wrap justify-start">
					{capabilities.canManageRequisitions ? (
						<TabsTrigger value="requisitions">Requisitions</TabsTrigger>
					) : null}
					{capabilities.canManageCandidates ? (
						<TabsTrigger value="pipeline">Pipeline</TabsTrigger>
					) : null}
					{capabilities.canReadInterviews ? (
						<TabsTrigger value="interviews">Interviews</TabsTrigger>
					) : null}
					{capabilities.canManageOffers ? (
						<TabsTrigger value="offers">Offers</TabsTrigger>
					) : null}
					{capabilities.canManageCandidates ? (
						<TabsTrigger value="consent">Consent</TabsTrigger>
					) : null}
					{capabilities.canHire ? (
						<TabsTrigger value="hire">Hire conversion</TabsTrigger>
					) : null}
				</TabsList>

				{capabilities.canManageRequisitions ? (
					<TabsContent className="space-y-6" value="requisitions">
						<ErrorNotice message={data.errors.requisitions} />
						<Card>
							<CardHeader>
								<CardTitle>Create requisition</CardTitle>
								<CardDescription>
									Start a governed requisition draft.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<RequisitionCreateForm />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Requisitions</CardTitle>
							</CardHeader>
							<CardContent>
								{data.requisitions.length ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Code</TableHead>
												<TableHead>Title</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.requisitions.map((item) => (
												<TableRow key={item.id}>
													<TableCell>{item.code}</TableCell>
													<TableCell>{item.title}</TableCell>
													<TableCell>{status(item.status)}</TableCell>
													<TableCell>
														<RequisitionTransitionForm requisition={item} />
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<Empty size="sm" title="No requisitions" />
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}

				{capabilities.canManageCandidates ? (
					<TabsContent className="space-y-6" value="pipeline">
						<ErrorNotice message={data.errors.candidates} />
						<Card>
							<CardHeader>
								<CardTitle>Candidate pipeline</CardTitle>
								<CardDescription>
									Applications are tied to tenant-scoped candidate and
									requisition records.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{data.applications.length ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Candidate</TableHead>
												<TableHead>Requisition</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.applications.map((application) => (
												<TableRow key={application.id}>
													<TableCell>
														{candidates.get(application.candidateId)
															?.displayName ?? "Candidate"}
													</TableCell>
													<TableCell>
														{requisitions.get(application.requisitionId)
															?.title ?? "Requisition"}
													</TableCell>
													<TableCell>{status(application.status)}</TableCell>
													<TableCell>
														<PipelineTransitionForm application={application} />
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<Empty size="sm" title="No applications" />
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}

				{capabilities.canReadInterviews ? (
					<TabsContent className="space-y-6" value="interviews">
						<ErrorNotice message={data.errors.interviews} />
						{capabilities.canRecordInterviews ? (
							<Card>
								<CardHeader>
									<CardTitle>Schedule interviews</CardTitle>
									<CardDescription>
										Only applications in interviewing status are eligible.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{data.applications
										.filter((item) => item.status === "interviewing")
										.map((item) => (
											<div className="space-y-3" key={item.id}>
												<p className="font-medium text-sm">
													{candidates.get(item.candidateId)?.displayName ??
														"Candidate"}
												</p>
												<InterviewScheduleForm applicationId={item.id} />
											</div>
										))}
								</CardContent>
							</Card>
						) : null}
						<Card>
							<CardHeader>
								<CardTitle>Interview schedule</CardTitle>
							</CardHeader>
							<CardContent>
								{data.interviews.length ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Application</TableHead>
												<TableHead>Scheduled</TableHead>
												<TableHead>Interviewer</TableHead>
												<TableHead>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.interviews.map((item) => (
												<TableRow key={item.id}>
													<TableCell>{item.applicationId}</TableCell>
													<TableCell>
														{item.scheduledAt.toLocaleString()}
													</TableCell>
													<TableCell>{item.interviewerActorId}</TableCell>
													<TableCell>{status(item.status)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<Empty size="sm" title="No interviews" />
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}

				{capabilities.canManageOffers ? (
					<TabsContent className="space-y-6" value="offers">
						<ErrorNotice message={data.errors.offers} />
						<Card>
							<CardHeader>
								<CardTitle>Create offer</CardTitle>
								<CardDescription>
									Create a draft from an interviewing application.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{data.applications
									.filter((item) => item.status === "interviewing")
									.map((item) => (
										<div className="space-y-3" key={item.id}>
											<p className="font-medium text-sm">
												{candidates.get(item.candidateId)?.displayName ??
													"Candidate"}
											</p>
											<OfferCreateForm applicationId={item.id} />
										</div>
									))}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Offers</CardTitle>
							</CardHeader>
							<CardContent>
								{data.offers.length ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Application</TableHead>
												<TableHead>Terms</TableHead>
												<TableHead>Expires</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.offers.map((item) => (
												<TableRow key={item.id}>
													<TableCell>{item.applicationId}</TableCell>
													<TableCell className="max-w-md">
														{item.termsSummary}
													</TableCell>
													<TableCell>{item.expiresOn}</TableCell>
													<TableCell>{status(item.status)}</TableCell>
													<TableCell>
														<OfferTransitionForm offer={item} />
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<Empty size="sm" title="No offers" />
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}

				{capabilities.canManageCandidates ? (
					<TabsContent value="consent">
						<Card>
							<CardHeader>
								<CardTitle>Candidate consent</CardTitle>
								<CardDescription>
									Consent withdrawal is irreversible and remains tenant-scoped.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{data.candidates.length ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Candidate</TableHead>
												<TableHead>Policy</TableHead>
												<TableHead>Captured</TableHead>
												<TableHead>Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.candidates.map((item) => (
												<TableRow key={item.id}>
													<TableCell>{item.displayName}</TableCell>
													<TableCell>
														{item.consentPolicyVersion ?? "Not captured"}
													</TableCell>
													<TableCell>
														{item.consentCapturedAt?.toLocaleDateString() ??
															"Not captured"}
													</TableCell>
													<TableCell>
														{item.consentCapturedAt &&
														!item.consentWithdrawnAt ? (
															<CandidateConsentForm candidate={item} />
														) : (
															status(item.status)
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<Empty size="sm" title="No candidates" />
								)}
							</CardContent>
						</Card>
					</TabsContent>
				) : null}

				{capabilities.canHire ? (
					<TabsContent className="space-y-6" value="hire">
						<Alert>
							<AlertTitle>Accepted-offer conversion</AlertTitle>
							<AlertDescription>
								Conversion creates the employee lifecycle and governed
								onboarding tasks through the package orchestrator.
							</AlertDescription>
						</Alert>
						{data.offers
							.filter((item) => item.status === "accepted")
							.map((offer) => (
								<Card key={offer.id}>
									<CardHeader>
										<CardTitle>Offer {offer.id}</CardTitle>
										<CardDescription>{offer.termsSummary}</CardDescription>
									</CardHeader>
									<CardContent>
										<HireConversionForm offerId={offer.id} />
									</CardContent>
								</Card>
							))}
						{data.offers.every((item) => item.status !== "accepted") ? (
							<Empty size="sm" title="No accepted offers awaiting conversion" />
						) : null}
					</TabsContent>
				) : null}
			</Tabs>
		</section>
	);
}
