// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	Input,
	Label,
	Spinner,
	Textarea,
} from "@afenda/ui-system";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { hireFromAcceptedOfferAction } from "@/app/actions/hr-hiring";
import {
	acceptOfferAction,
	approveOfferAction,
	approveRequisitionAction,
	closeRequisitionAction,
	createDraftRequisitionAction,
	createOfferAction,
	issueOfferAction,
	moveApplicationToInReviewAction,
	moveApplicationToInterviewingAction,
	openRequisitionAction,
	scheduleInterviewAction,
	submitRequisitionAction,
	withdrawCandidateConsentAction,
} from "@/app/actions/hr-recruitment";

type Feedback = { ok: boolean; message: string } | null;

function ResultMessage({ feedback }: { feedback: Feedback }) {
	if (!feedback) {
		return null;
	}
	if (!feedback.ok) {
		return <FormError>{feedback.message}</FormError>;
	}
	return (
		<Alert role="status">
			<AlertTitle>Recruitment record updated</AlertTitle>
			<AlertDescription>{feedback.message}</AlertDescription>
		</Alert>
	);
}

function useRecruitmentAction() {
	const router = useRouter();
	const [feedback, setFeedback] = useState<Feedback>(null);
	const [pending, startTransition] = useTransition();
	function run(
		action: () => Promise<{ ok: boolean; message?: string }>,
		successMessage: string,
	) {
		startTransition(async () => {
			const result = await action();
			setFeedback({
				ok: result.ok,
				message: result.ok
					? successMessage
					: (result.message ??
						"The recruitment action could not be completed."),
			});
			if (result.ok) {
				router.refresh();
			}
		});
	}
	return { feedback, pending, run };
}

export function RequisitionCreateForm() {
	const state = useRecruitmentAction();
	return (
		<form
			aria-busy={state.pending}
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						createDraftRequisitionAction({
							idempotencyKey: crypto.randomUUID(),
							code: data.get("code"),
							title: data.get("title"),
						}),
					"Requisition draft created.",
				);
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="requisition-code">Code</Label>
					<Input id="requisition-code" maxLength={64} name="code" required />
				</div>
				<div className="space-y-2">
					<Label htmlFor="requisition-title">Title</Label>
					<Input id="requisition-title" maxLength={200} name="title" required />
				</div>
			</div>
			<ResultMessage feedback={state.feedback} />
			<Button disabled={state.pending} type="submit">
				{state.pending ? <Spinner /> : null}Create requisition draft
			</Button>
		</form>
	);
}

export function RequisitionTransitionForm({
	requisition,
}: {
	requisition: { id: string; status: string; version: number };
}) {
	const state = useRecruitmentAction();
	const transition =
		requisition.status === "draft"
			? { label: "Submit", action: submitRequisitionAction }
			: requisition.status === "submitted"
				? { label: "Approve", action: approveRequisitionAction }
				: requisition.status === "approved"
					? { label: "Open", action: openRequisitionAction }
					: requisition.status === "open"
						? { label: "Close", action: closeRequisitionAction }
						: null;
	if (!transition) {
		return null;
	}
	return (
		<div className="space-y-2">
			<ResultMessage feedback={state.feedback} />
			<Button
				disabled={state.pending}
				onClick={() =>
					state.run(
						() =>
							transition.action({
								requisitionId: requisition.id,
								expectedVersion: requisition.version,
							}),
						`Requisition ${transition.label.toLowerCase()} completed.`,
					)
				}
				type="button"
				variant="outline"
			>
				{state.pending ? <Spinner /> : null}
				{transition.label}
			</Button>
		</div>
	);
}

export function PipelineTransitionForm({
	application,
}: {
	application: { id: string; status: string; version: number };
}) {
	const state = useRecruitmentAction();
	const transition =
		application.status === "submitted"
			? { label: "Move to review", action: moveApplicationToInReviewAction }
			: application.status === "in_review"
				? {
						label: "Move to interviewing",
						action: moveApplicationToInterviewingAction,
					}
				: null;
	if (!transition) {
		return null;
	}
	return (
		<div className="space-y-2">
			<ResultMessage feedback={state.feedback} />
			<Button
				disabled={state.pending}
				onClick={() =>
					state.run(
						() =>
							transition.action({
								applicationId: application.id,
								expectedVersion: application.version,
							}),
						`${transition.label} completed.`,
					)
				}
				type="button"
				variant="outline"
			>
				{state.pending ? <Spinner /> : null}
				{transition.label}
			</Button>
		</div>
	);
}

export function InterviewScheduleForm({
	applicationId,
}: {
	applicationId: string;
}) {
	const state = useRecruitmentAction();
	return (
		<form
			aria-busy={state.pending}
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						scheduleInterviewAction({
							applicationId,
							scheduledAt: new Date(
								String(data.get("scheduledAt")),
							).toISOString(),
							interviewerActorId: data.get("interviewerActorId"),
						}),
					"Interview scheduled.",
				);
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor={`scheduled-${applicationId}`}>Scheduled at</Label>
					<Input
						id={`scheduled-${applicationId}`}
						name="scheduledAt"
						required
						type="datetime-local"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`interviewer-${applicationId}`}>
						Interviewer user ID
					</Label>
					<Input
						id={`interviewer-${applicationId}`}
						name="interviewerActorId"
						required
					/>
				</div>
			</div>
			<ResultMessage feedback={state.feedback} />
			<Button disabled={state.pending} type="submit">
				{state.pending ? <Spinner /> : null}Schedule interview
			</Button>
		</form>
	);
}

export function OfferCreateForm({ applicationId }: { applicationId: string }) {
	const state = useRecruitmentAction();
	return (
		<form
			aria-busy={state.pending}
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						createOfferAction({
							applicationId,
							termsSummary: data.get("termsSummary"),
							expiresOn: data.get("expiresOn"),
						}),
					"Offer draft created.",
				);
			}}
		>
			<div className="space-y-2">
				<Label htmlFor={`offer-terms-${applicationId}`}>Terms summary</Label>
				<Textarea
					id={`offer-terms-${applicationId}`}
					maxLength={2000}
					name="termsSummary"
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor={`offer-expiry-${applicationId}`}>Expires on</Label>
				<Input
					id={`offer-expiry-${applicationId}`}
					name="expiresOn"
					required
					type="date"
				/>
			</div>
			<ResultMessage feedback={state.feedback} />
			<Button disabled={state.pending} type="submit">
				{state.pending ? <Spinner /> : null}Create offer
			</Button>
		</form>
	);
}

export function CandidateConsentForm({
	candidate,
}: {
	candidate: { id: string; version: number };
}) {
	const state = useRecruitmentAction();
	return (
		<div className="space-y-2">
			<ResultMessage feedback={state.feedback} />
			<Button
				disabled={state.pending}
				onClick={() =>
					state.run(
						() =>
							withdrawCandidateConsentAction({
								candidateId: candidate.id,
								expectedVersion: candidate.version,
							}),
						"Candidate consent withdrawn.",
					)
				}
				type="button"
				variant="destructive"
			>
				{state.pending ? <Spinner /> : null}Withdraw consent
			</Button>
		</div>
	);
}

export function OfferTransitionForm({
	offer,
}: {
	offer: { id: string; status: string; version: number };
}) {
	const state = useRecruitmentAction();
	const transition =
		offer.status === "draft"
			? { label: "Approve", action: approveOfferAction, idempotent: false }
			: offer.status === "approved"
				? { label: "Issue", action: issueOfferAction, idempotent: false }
				: offer.status === "issued"
					? { label: "Accept", action: acceptOfferAction, idempotent: true }
					: null;
	if (!transition) {
		return null;
	}
	return (
		<div className="space-y-2">
			<ResultMessage feedback={state.feedback} />
			<Button
				disabled={state.pending}
				onClick={() =>
					state.run(
						() =>
							transition.action({
								offerId: offer.id,
								expectedVersion: offer.version,
								...(transition.idempotent
									? { idempotencyKey: crypto.randomUUID() }
									: {}),
							}),
						`Offer ${transition.label.toLowerCase()} completed.`,
					)
				}
				type="button"
				variant="outline"
			>
				{state.pending ? <Spinner /> : null}
				{transition.label}
			</Button>
		</div>
	);
}

export function HireConversionForm({ offerId }: { offerId: string }) {
	const state = useRecruitmentAction();
	return (
		<form
			aria-busy={state.pending}
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						hireFromAcceptedOfferAction({
							idempotencyKey: crypto.randomUUID(),
							offerId,
							employeeNumber: data.get("employeeNumber"),
							startsOn: data.get("startsOn"),
							positionId: data.get("positionId") || undefined,
							legalName: data.get("legalName") || undefined,
							tasks: [
								{
									code: "identity",
									title: "Verify identity and employment records",
									mandatory: true,
								},
								{
									code: "access",
									title: "Provision required access",
									mandatory: true,
								},
								{
									code: "orientation",
									title: "Complete employee orientation",
									mandatory: true,
								},
							],
							legalEntityKey: data.get("legalEntityKey"),
							businessUnitKey: data.get("businessUnitKey"),
							locationKey: data.get("locationKey"),
							costCentreKey: data.get("costCentreKey"),
							projectKey: data.get("projectKey"),
						}),
					"Candidate converted to employee and onboarding started.",
				);
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor={`employee-number-${offerId}`}>Employee number</Label>
					<Input
						id={`employee-number-${offerId}`}
						name="employeeNumber"
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`starts-on-${offerId}`}>Starts on</Label>
					<Input
						id={`starts-on-${offerId}`}
						name="startsOn"
						required
						type="date"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`legal-name-${offerId}`}>Legal name</Label>
					<Input id={`legal-name-${offerId}`} name="legalName" />
				</div>
				<div className="space-y-2">
					<Label htmlFor={`position-${offerId}`}>Position ID</Label>
					<Input id={`position-${offerId}`} name="positionId" />
				</div>
				{[
					"legalEntityKey",
					"businessUnitKey",
					"locationKey",
					"costCentreKey",
					"projectKey",
				].map((name) => (
					<div className="space-y-2" key={name}>
						<Label htmlFor={`${name}-${offerId}`}>
							{name.replace("Key", " key")}
						</Label>
						<Input id={`${name}-${offerId}`} name={name} required />
					</div>
				))}
			</div>
			<ResultMessage feedback={state.feedback} />
			<Button disabled={state.pending} type="submit">
				{state.pending ? <Spinner /> : null}Convert accepted offer
			</Button>
		</form>
	);
}
// biome-ignore-all lint/style/noNestedTernary: Exhaustive status and tri-state view mappings remain explicit at their use sites.
