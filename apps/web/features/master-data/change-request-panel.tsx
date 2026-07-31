// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	Input,
	NativeSelect,
	NativeSelectOption,
	Spinner,
} from "@afenda/ui-system";
import { useActionState, useState } from "react";
import {
	type ActivatePartyActionState,
	activatePartyAction,
} from "@/app/actions/activate-party";
import {
	type ApproveChangeRequestActionState,
	approveChangeRequestAction,
} from "@/app/actions/approve-change-request";
import {
	type RejectChangeRequestActionState,
	rejectChangeRequestAction,
} from "@/app/actions/reject-change-request";
import {
	type SubmitChangeRequestActionState,
	submitChangeRequestAction,
} from "@/app/actions/submit-change-request";

interface PartyOption {
	id: string;
	label: string;
	status: string;
	version: number;
}

interface ChangeRequestOption {
	code: string;
	commandKind: string;
	id: string;
	label: string;
	status: string;
	subjectEntityId: string;
	version: number;
}

interface ChangeRequestPanelProps {
	approvedActivateRequests: ChangeRequestOption[];
	canApply: boolean;
	canApprove: boolean;
	canSubmit: boolean;
	parties: PartyOption[];
	submittedRequests: ChangeRequestOption[];
}

const submitInitial: SubmitChangeRequestActionState = null;
const approveInitial: ApproveChangeRequestActionState = null;
const rejectInitial: RejectChangeRequestActionState = null;
const activateInitial: ActivatePartyActionState = null;

function pickById<T extends { id: string }>(
	items: T[],
	id: string | undefined,
): T | undefined {
	if (id === undefined) {
		return items[0];
	}
	return items.find((item) => item.id === id) ?? items[0];
}

/**
 * MDG steward panel — submit / review CRs and apply approved activate.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Lifecycle and approval branches share one governed change-request surface.
export function ChangeRequestPanel({
	canApply,
	canApprove,
	canSubmit,
	parties,
	submittedRequests,
	approvedActivateRequests,
}: ChangeRequestPanelProps) {
	const [submitState, submitAction, submitPending] = useActionState(
		submitChangeRequestAction,
		submitInitial,
	);
	const [approveState, approveAction, approvePending] = useActionState(
		approveChangeRequestAction,
		approveInitial,
	);
	const [rejectState, rejectAction, rejectPending] = useActionState(
		rejectChangeRequestAction,
		rejectInitial,
	);
	const [activateState, activateAction, activatePending] = useActionState(
		activatePartyAction,
		activateInitial,
	);

	const draftParties = parties.filter((party) => party.status === "draft");
	const [defaultDraft] = draftParties;

	const [selectedReviewId, setSelectedReviewId] = useState(
		submittedRequests[0]?.id,
	);
	const selectedReview = pickById(submittedRequests, selectedReviewId);

	const [selectedActivateCrId, setSelectedActivateCrId] = useState(
		approvedActivateRequests[0]?.id,
	);
	const selectedActivateCr = pickById(
		approvedActivateRequests,
		selectedActivateCrId,
	);
	const applyParty = selectedActivateCr
		? parties.find((party) => party.id === selectedActivateCr.subjectEntityId)
		: undefined;

	return (
		<div className="flex flex-col gap-8">
			{canSubmit ? (
				<section className="space-y-3">
					<h3 className="font-medium text-sm">Submit activate request</h3>
					{draftParties.length === 0 ? (
						<Alert role="status">
							<AlertTitle>No draft parties</AlertTitle>
							<AlertDescription>
								Create a draft party (with an active role) before requesting
								activation.
							</AlertDescription>
						</Alert>
					) : (
						<form action={submitAction} className="flex flex-col gap-3">
							<input name="commandKind" type="hidden" value="activate_party" />
							<FormField label="Party">
								<NativeSelect
									defaultValue={defaultDraft?.id}
									name="partyId"
									required
								>
									{draftParties.map((party) => (
										<NativeSelectOption key={party.id} value={party.id}>
											{party.label}
										</NativeSelectOption>
									))}
								</NativeSelect>
							</FormField>
							{!submitPending && submitState?.ok === false ? (
								<FormError>{submitState.message}</FormError>
							) : null}
							{!submitPending && submitState?.ok === true ? (
								<Alert role="status">
									<AlertTitle>Submitted</AlertTitle>
									<AlertDescription>
										Change request {submitState.data.changeRequest.code} is
										awaiting checker approval.
									</AlertDescription>
								</Alert>
							) : null}
							<Button disabled={submitPending} type="submit">
								{submitPending ? <Spinner /> : null}
								Submit activate request
							</Button>
						</form>
					)}
				</section>
			) : null}

			{canApprove ? (
				<section className="space-y-3">
					<h3 className="font-medium text-sm">Review queue</h3>
					{submittedRequests.length === 0 || selectedReview === undefined ? (
						<p className="text-muted-foreground text-sm">
							No submitted change requests.
						</p>
					) : (
						<div className="flex flex-col gap-4">
							<FormField label="Submitted request">
								<NativeSelect
									onChange={(event) =>
										setSelectedReviewId(event.currentTarget.value)
									}
									required
									value={selectedReview.id}
								>
									{submittedRequests.map((request) => (
										<NativeSelectOption key={request.id} value={request.id}>
											{request.label}
										</NativeSelectOption>
									))}
								</NativeSelect>
							</FormField>
							<form action={approveAction} className="flex flex-col gap-3">
								<input
									name="changeRequestId"
									type="hidden"
									value={selectedReview.id}
								/>
								<input
									name="expectedVersion"
									type="hidden"
									value={selectedReview.version}
								/>
								{!approvePending && approveState?.ok === false ? (
									<FormError>{approveState.message}</FormError>
								) : null}
								<Button disabled={approvePending} type="submit">
									{approvePending ? <Spinner /> : null}
									Approve
								</Button>
							</form>
							<form action={rejectAction} className="flex flex-col gap-3">
								<input
									name="changeRequestId"
									type="hidden"
									value={selectedReview.id}
								/>
								<input
									name="expectedVersion"
									type="hidden"
									value={selectedReview.version}
								/>
								<FormField label="Reject note (optional)">
									<Input maxLength={500} name="reviewNote" />
								</FormField>
								{!rejectPending && rejectState?.ok === false ? (
									<FormError>{rejectState.message}</FormError>
								) : null}
								<Button disabled={rejectPending} type="submit">
									{rejectPending ? <Spinner /> : null}
									Reject
								</Button>
							</form>
						</div>
					)}
				</section>
			) : null}

			{canApply ? (
				<section className="space-y-3">
					<h3 className="font-medium text-sm">Apply approved activation</h3>
					{selectedActivateCr === undefined || applyParty === undefined ? (
						<p className="text-muted-foreground text-sm">
							No approved activate requests ready to apply.
						</p>
					) : (
						<form action={activateAction} className="flex flex-col gap-3">
							<input name="partyId" type="hidden" value={applyParty.id} />
							<input
								name="expectedVersion"
								type="hidden"
								value={applyParty.version}
							/>
							<input
								name="changeRequestId"
								type="hidden"
								value={selectedActivateCr.id}
							/>
							<FormField label="Approved change request">
								<NativeSelect
									onChange={(event) =>
										setSelectedActivateCrId(event.currentTarget.value)
									}
									required
									value={selectedActivateCr.id}
								>
									{approvedActivateRequests.map((request) => (
										<NativeSelectOption key={request.id} value={request.id}>
											{request.label}
										</NativeSelectOption>
									))}
								</NativeSelect>
							</FormField>
							{!activatePending && activateState?.ok === false ? (
								<FormError>{activateState.message}</FormError>
							) : null}
							{!activatePending && activateState?.ok === true ? (
								<Alert role="status">
									<AlertTitle>Activated</AlertTitle>
									<AlertDescription>
										Party is now active under the approved change request.
									</AlertDescription>
								</Alert>
							) : null}
							<Button disabled={activatePending} type="submit">
								{activatePending ? <Spinner /> : null}
								Apply activation
							</Button>
						</form>
					)}
				</section>
			) : null}
		</div>
	);
}
