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
import { useActionState } from "react";

import {
	type MergePartiesActionState,
	mergePartiesAction,
} from "@/app/actions/merge-parties";
import {
	type SubmitChangeRequestActionState,
	submitChangeRequestAction,
} from "@/app/actions/submit-change-request";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: MergePartiesActionState = null;
const submitInitial: SubmitChangeRequestActionState = null;

type PartyOption = {
	id: string;
	label: string;
	version: number;
};

type ApprovedMergeRequest = {
	id: string;
	label: string;
	sourcePartyId: string;
	targetPartyId: string;
};

type MergePartiesFormProps = {
	canManage: boolean;
	parties: PartyOption[];
	approvedMergeRequests: ApprovedMergeRequest[];
};

function partyToken(party: PartyOption): string {
	return `${party.id}:${party.version}`;
}

/**
 * MDG merge UI — submit merge CR, then apply with approved changeRequestId.
 */
export function MergePartiesForm({
	canManage,
	parties,
	approvedMergeRequests,
}: MergePartiesFormProps) {
	const [state, formAction, pending] = useActionState(
		mergePartiesAction,
		initialState,
	);
	const [submitState, submitAction, submitPending] = useActionState(
		submitChangeRequestAction,
		submitInitial,
	);

	if (!canManage) {
		return null;
	}

	if (parties.length < 2) {
		return (
			<Alert role="status">
				<AlertTitle>Merge unavailable</AlertTitle>
				<AlertDescription>
					At least two parties are required for a governed merge.
				</AlertDescription>
			</Alert>
		);
	}

	const sourceError = actionFieldMessage(state, "sourcePartyId");
	const targetError = actionFieldMessage(state, "targetPartyId");
	const showFormError =
		!pending &&
		state?.ok === false &&
		sourceError === undefined &&
		targetError === undefined;

	const defaultSource = parties[0];
	const defaultTarget = parties[1];
	const defaultApproved = approvedMergeRequests[0];

	return (
		<div className="flex max-w-lg flex-col gap-8">
			<form
				action={submitAction}
				className="flex flex-col gap-(--field-gap)"
				aria-busy={submitPending}
			>
				<input type="hidden" name="commandKind" value="merge_parties" />
				<p className="text-sm text-muted-foreground">
					Step 1 — submit a merge change request for checker approval.
				</p>
				<FormField label="Source (will retire)" required>
					<NativeSelect
						name="sourcePartyId"
						disabled={submitPending}
						defaultValue={defaultSource?.id}
					>
						{parties.map((party) => (
							<NativeSelectOption key={party.id} value={party.id}>
								{party.label}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</FormField>
				<FormField label="Target (survivor)" required>
					<NativeSelect
						name="targetPartyId"
						disabled={submitPending}
						defaultValue={defaultTarget?.id}
					>
						{parties.map((party) => (
							<NativeSelectOption key={party.id} value={party.id}>
								{party.label}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</FormField>
				<FormField label="Name decision">
					<NativeSelect
						name="nameDecision"
						defaultValue="target"
						disabled={submitPending}
					>
						<NativeSelectOption value="target">
							Keep target name
						</NativeSelectOption>
						<NativeSelectOption value="source">
							Take source name
						</NativeSelectOption>
					</NativeSelect>
				</FormField>
				{!submitPending && submitState?.ok === false ? (
					<FormError>{submitState.message}</FormError>
				) : null}
				{!submitPending && submitState?.ok === true ? (
					<Alert role="status">
						<AlertTitle>Merge request submitted</AlertTitle>
						<AlertDescription>
							{submitState.data.changeRequest.code} awaits checker approval.
						</AlertDescription>
					</Alert>
				) : null}
				<Button type="submit" disabled={submitPending}>
					{submitPending ? <Spinner /> : null}
					Submit merge request
				</Button>
			</form>

			<form
				action={formAction}
				aria-busy={pending}
				className="flex flex-col gap-(--field-gap)"
			>
				<p className="text-sm text-muted-foreground">
					Step 2 — apply an approved merge change request.
				</p>
				{state?.ok === true ? (
					<Alert role="status">
						<AlertTitle>Parties merged</AlertTitle>
						<AlertDescription>
							Survivor {state.data.survivor.code}; former{" "}
							{state.data.merged.code} retired into survivor.
						</AlertDescription>
					</Alert>
				) : null}
				{showFormError && state?.ok === false ? (
					<FormError>{state.message}</FormError>
				) : null}
				{approvedMergeRequests.length === 0 ? (
					<Alert role="status">
						<AlertTitle>No approved merge requests</AlertTitle>
						<AlertDescription>
							A checker must approve a merge change request before apply.
						</AlertDescription>
					</Alert>
				) : (
					<>
						<FormField label="Approved change request" required>
							<NativeSelect
								name="changeRequestId"
								disabled={pending}
								defaultValue={defaultApproved?.id}
							>
								{approvedMergeRequests.map((request) => (
									<NativeSelectOption key={request.id} value={request.id}>
										{request.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</FormField>
						<FormField
							label="Source (will retire)"
							required
							fieldId="merge-source"
							error={sourceError}
						>
							<NativeSelect
								name="sourceParty"
								disabled={pending}
								defaultValue={
									defaultSource ? partyToken(defaultSource) : undefined
								}
							>
								{parties.map((party) => (
									<NativeSelectOption key={party.id} value={partyToken(party)}>
										{party.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</FormField>
						<FormField
							label="Target (survivor)"
							required
							fieldId="merge-target"
							error={targetError}
						>
							<NativeSelect
								name="targetParty"
								disabled={pending}
								defaultValue={
									defaultTarget ? partyToken(defaultTarget) : undefined
								}
							>
								{parties.map((party) => (
									<NativeSelectOption key={party.id} value={partyToken(party)}>
										{party.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</FormField>
						<FormField label="Name decision" fieldId="merge-name-decision">
							<NativeSelect
								name="nameDecision"
								defaultValue="target"
								disabled={pending}
							>
								<NativeSelectOption value="target">
									Keep target name
								</NativeSelectOption>
								<NativeSelectOption value="source">
									Take source name
								</NativeSelectOption>
							</NativeSelect>
						</FormField>
						<Button type="submit" disabled={pending}>
							{pending ? <Spinner /> : null}
							Apply merge
						</Button>
					</>
				)}
			</form>
		</div>
	);
}
