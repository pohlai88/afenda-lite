import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END,
} from "../module-ids";
import {
	addBenefitEnrollmentDependentInputSchema,
	endBenefitEnrollmentDependentInputSchema,
} from "../schemas/compensation";
import { runCompensationCommand } from "../shared/compensation-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { BenefitEnrollmentDependent } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_BENEFIT_ENROLLMENT_DEPENDENT =
	"benefit_enrollment_dependent" as const;
export type HumanResourcesBenefitEnrollmentDependentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_BENEFIT_ENROLLMENT_DEPENDENT;

export async function addBenefitEnrollmentDependent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollmentDependent>> {
	return runCompensationCommand(input, options, {
		schema: addBenefitEnrollmentDependentInputSchema,
		invalidMessage: "Invalid benefit enrollment dependent add input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD,
		execute: (data, { store, ports }) =>
			store.addBenefitEnrollmentDependent(
				{
					organizationId: data.organizationId,
					enrollmentId: data.enrollmentId,
					dependentName: data.dependentName,
					relationship: data.relationship,
					effectiveFrom: data.effectiveFrom,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD,
				}),
			),
	});
}

export async function endBenefitEnrollmentDependent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollmentDependent>> {
	return runCompensationCommand(input, options, {
		schema: endBenefitEnrollmentDependentInputSchema,
		invalidMessage: "Invalid benefit enrollment dependent end input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END,
		execute: (data, { store, ports }) =>
			store.endBenefitEnrollmentDependent(
				{
					organizationId: data.organizationId,
					dependentId: data.dependentId,
					endsOn: data.endsOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END,
				}),
			),
	});
}
