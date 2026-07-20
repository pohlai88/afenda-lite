"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
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

type PartyOption = {
	id: string;
	label: string;
	version: number;
	status: string;
};

type ChangeRequestOption = {
	id: string;
	code: string;
	commandKind: string;
	status: string;
	version: number;
	subjectEntityId: string;
	label: string;
};

type ChangeRequestPanelProps = {
	canManage: boolean;
	canApprove: boolean;
	parties: PartyOption[];
	submittedRequests: ChangeRequestOption[];
	approvedActivateRequests: ChangeRequestOption[];
};

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
export function ChangeRequestPanel({
	canManage,
	canApprove,
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
	const defaultDraft = draftParties[0];

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
			{canManage ? (
				<section className="space-y-3">
					<h3 className="text-sm font-medium">Submit activate request</h3>
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
							<input type="hidden" name="commandKind" value="activate_party" />
							<FormField label="Party">
								<NativeSelect
									name="partyId"
									defaultValue={defaultDraft?.id}
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
							<Button type="submit" disabled={submitPending}>
								{submitPending ? <Spinner /> : null}
								Submit activate request
							</Button>
						</form>
					)}
				</section>
			) : null}

			{canApprove ? (
				<section className="space-y-3">
					<h3 className="text-sm font-medium">Review queue</h3>
					{submittedRequests.length === 0 || selectedReview === undefined ? (
						<p className="text-sm text-muted-foreground">
							No submitted change requests.
						</p>
					) : (
						<div className="flex flex-col gap-4">
							<FormField label="Submitted request">
								<NativeSelect
									value={selectedReview.id}
									onChange={(event) =>
										setSelectedReviewId(event.currentTarget.value)
									}
									required
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
									type="hidden"
									name="changeRequestId"
									value={selectedReview.id}
								/>
								<input
									type="hidden"
									name="expectedVersion"
									value={selectedReview.version}
								/>
								{!approvePending && approveState?.ok === false ? (
									<FormError>{approveState.message}</FormError>
								) : null}
								<Button type="submit" disabled={approvePending}>
									{approvePending ? <Spinner /> : null}
									Approve
								</Button>
							</form>
							<form action={rejectAction} className="flex flex-col gap-3">
								<input
									type="hidden"
									name="changeRequestId"
									value={selectedReview.id}
								/>
								<input
									type="hidden"
									name="expectedVersion"
									value={selectedReview.version}
								/>
								<FormField label="Reject note (optional)">
									<input
										name="reviewNote"
										className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
										maxLength={500}
									/>
								</FormField>
								{!rejectPending && rejectState?.ok === false ? (
									<FormError>{rejectState.message}</FormError>
								) : null}
								<Button type="submit" disabled={rejectPending}>
									{rejectPending ? <Spinner /> : null}
									Reject
								</Button>
							</form>
						</div>
					)}
				</section>
			) : null}

			{canManage ? (
				<section className="space-y-3">
					<h3 className="text-sm font-medium">Apply approved activation</h3>
					{selectedActivateCr === undefined || applyParty === undefined ? (
						<p className="text-sm text-muted-foreground">
							No approved activate requests ready to apply.
						</p>
					) : (
						<form action={activateAction} className="flex flex-col gap-3">
							<input type="hidden" name="partyId" value={applyParty.id} />
							<input
								type="hidden"
								name="expectedVersion"
								value={applyParty.version}
							/>
							<input
								type="hidden"
								name="changeRequestId"
								value={selectedActivateCr.id}
							/>
							<FormField label="Approved change request">
								<NativeSelect
									value={selectedActivateCr.id}
									onChange={(event) =>
										setSelectedActivateCrId(event.currentTarget.value)
									}
									required
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
							<Button type="submit" disabled={activatePending}>
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
