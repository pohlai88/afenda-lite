import { ok, type Result } from "@afenda/errors/result";

import type { ChangeRequestRecord } from "./change-request-types";
import {
	governanceRequestExpired,
	governanceRequestNotApproved,
	governanceVersionConflict,
} from "./governance-errors";

export type ChangeRequestApplyGateInput = Readonly<{
	request: Pick<
		ChangeRequestRecord,
		| "id"
		| "status"
		| "expiresAt"
		| "proposalVersion"
		| "mutableFieldAllowlistVersion"
	>;
	expectedProposalVersion: number;
	currentAllowlistVersion: number;
	now: Date;
}>;

export type ChangeRequestTargetVersionGateInput = Readonly<{
	targetEntityId: string;
	expectedTargetVersion: number;
	actualTargetVersion: number;
}>;

export function assertChangeRequestApplyGate(
	input: ChangeRequestApplyGateInput,
): Result<true> {
	const { request, expectedProposalVersion, currentAllowlistVersion, now } =
		input;

	if (request.status !== "approved") {
		return governanceRequestNotApproved({
			operation: "change_request.apply",
			currentStatus: request.status,
		});
	}
	if (
		request.expiresAt !== null &&
		request.expiresAt.getTime() <= now.getTime()
	) {
		return governanceRequestExpired({
			operation: "change_request.apply",
			entityId: request.id,
		});
	}
	if (request.proposalVersion !== expectedProposalVersion) {
		return governanceVersionConflict({
			operation: "change_request.apply",
			versionKind: "proposal",
			expectedVersion: expectedProposalVersion,
			actualVersion: request.proposalVersion,
		});
	}
	if (request.mutableFieldAllowlistVersion !== currentAllowlistVersion) {
		return governanceVersionConflict({
			operation: "change_request.apply",
			versionKind: "allowlist",
			expectedVersion: currentAllowlistVersion,
			actualVersion: request.mutableFieldAllowlistVersion,
		});
	}
	return ok(true);
}

export function assertChangeRequestTargetVersionGate(
	input: ChangeRequestTargetVersionGateInput,
): Result<true> {
	if (input.actualTargetVersion !== input.expectedTargetVersion) {
		return governanceVersionConflict({
			operation: "change_request.apply",
			versionKind: "target",
			expectedVersion: input.expectedTargetVersion,
			actualVersion: input.actualTargetVersion,
		});
	}
	return ok(true);
}
