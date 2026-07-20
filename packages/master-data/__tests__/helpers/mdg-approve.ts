import {
	approveChangeRequest,
	submitChangeRequest,
} from "../../src/change-request";
import type { MasterCommandOptions } from "../../src/command-options";
import type { ChangeRequest } from "../../src/types";

const MAKER = "user-maker";
const CHECKER = "user-checker";

/** Submit + approve an activate_party CR (maker ≠ checker). */
export async function approvedActivatePartyChangeRequest(
	input: {
		organizationId: string;
		partyId: string;
		correlationId?: string;
		makerUserId?: string;
		checkerUserId?: string;
	},
	options: MasterCommandOptions,
): Promise<ChangeRequest> {
	const maker = input.makerUserId ?? MAKER;
	const checker = input.checkerUserId ?? CHECKER;
	const submitted = await submitChangeRequest(
		{
			organizationId: input.organizationId,
			actorUserId: maker,
			correlationId: input.correlationId ?? "corr-mdg-activate",
			commandKind: "activate_party",
			payload: { partyId: input.partyId },
		},
		options,
	);
	if (!submitted.ok) {
		throw new Error(`submit CR failed: ${submitted.error.message}`);
	}
	const approved = await approveChangeRequest(
		{
			organizationId: input.organizationId,
			actorUserId: checker,
			correlationId: input.correlationId ?? "corr-mdg-activate-approve",
			id: submitted.data.id,
			expectedVersion: submitted.data.version,
		},
		options,
	);
	if (!approved.ok) {
		throw new Error(`approve CR failed: ${approved.error.message}`);
	}
	return approved.data;
}

/** Submit + approve a merge_parties CR (maker ≠ checker). */
export async function approvedMergePartiesChangeRequest(
	input: {
		organizationId: string;
		sourcePartyId: string;
		targetPartyId: string;
		correlationId?: string;
		makerUserId?: string;
		checkerUserId?: string;
		fieldDecisions?: {
			name?: "source" | "target";
		};
	},
	options: MasterCommandOptions,
): Promise<ChangeRequest> {
	const maker = input.makerUserId ?? MAKER;
	const checker = input.checkerUserId ?? CHECKER;
	const submitted = await submitChangeRequest(
		{
			organizationId: input.organizationId,
			actorUserId: maker,
			correlationId: input.correlationId ?? "corr-mdg-merge",
			commandKind: "merge_parties",
			payload: {
				sourcePartyId: input.sourcePartyId,
				targetPartyId: input.targetPartyId,
				fieldDecisions: input.fieldDecisions,
			},
		},
		options,
	);
	if (!submitted.ok) {
		throw new Error(`submit CR failed: ${submitted.error.message}`);
	}
	const approved = await approveChangeRequest(
		{
			organizationId: input.organizationId,
			actorUserId: checker,
			correlationId: input.correlationId ?? "corr-mdg-merge-approve",
			id: submitted.data.id,
			expectedVersion: submitted.data.version,
		},
		options,
	);
	if (!approved.ok) {
		throw new Error(`approve CR failed: ${approved.error.message}`);
	}
	return approved.data;
}
