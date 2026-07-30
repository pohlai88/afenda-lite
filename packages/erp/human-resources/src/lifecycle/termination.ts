import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE,
	HUMAN_RESOURCES_QUERY_TERMINATION_GET,
} from "../module-ids";
import {
	approveTerminationInputSchema,
	finalizeTerminationInputSchema,
	getTerminationInputSchema,
	proposeTerminationInputSchema,
} from "../schemas/lifecycle";
import { fingerprintTermination } from "../shared/fingerprint";
import {
	runLifecycleCommand,
	runLifecycleQuery,
} from "../shared/lifecycle-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { Termination } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_TERMINATION = "termination" as const;
export type HumanResourcesTerminationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TERMINATION;

export function proposeTermination(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Termination>> {
	return runLifecycleCommand(input, options, {
		schema: proposeTerminationInputSchema,
		invalidMessage: "Invalid propose termination input",
		command: HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintTermination({
				employmentId: data.employmentId,
				reasonCode: data.reasonCode,
				reasonDetail: data.reasonDetail,
				effectiveOn: data.effectiveOn,
				rehireEligible: data.rehireEligible,
			});
			return store.proposeTermination(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					reasonCode: data.reasonCode.trim(),
					reasonDetail: data.reasonDetail.trim(),
					effectiveOn: data.effectiveOn,
					rehireEligible: data.rehireEligible,
					idempotencyKey: data.idempotencyKey,
					terminationRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE,
				}),
			);
		},
	});
}

export function approveTermination(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Termination>> {
	return runLifecycleCommand(input, options, {
		schema: approveTerminationInputSchema,
		invalidMessage: "Invalid approve termination input",
		command: HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE,
		execute: (data, { store, ports }) =>
			store.approveTermination(
				{
					organizationId: data.organizationId,
					terminationId: data.terminationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE,
				}),
			),
	});
}

export function finalizeTermination(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Termination>> {
	return runLifecycleCommand(input, options, {
		schema: finalizeTerminationInputSchema,
		invalidMessage: "Invalid finalize termination input",
		command: HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
		execute: (data, { store, ports }) =>
			store.finalizeTermination(
				{
					organizationId: data.organizationId,
					terminationId: data.terminationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
				}),
			),
	});
}

export function getTermination(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Termination | null>> {
	return runLifecycleQuery(input, options, {
		schema: getTerminationInputSchema,
		invalidMessage: "Invalid get termination input",
		query: HUMAN_RESOURCES_QUERY_TERMINATION_GET,
		execute: (data, { store }) =>
			store.getTermination({
				organizationId: data.organizationId,
				terminationId: data.terminationId,
			}),
	});
}
