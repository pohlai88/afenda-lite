import type { Result } from "@afenda/errors";
import type { BenefitEnrollmentDependent } from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END,
} from "../../kernel/operations/module-ids";
import { runCompensationCapabilityCommand } from "./run-operation";
import {
	addBenefitEnrollmentDependentInputSchema,
	endBenefitEnrollmentDependentInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_BENEFIT_ENROLLMENT_DEPENDENT =
	"benefit_enrollment_dependent" as const;
export type HumanResourcesBenefitEnrollmentDependentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_BENEFIT_ENROLLMENT_DEPENDENT;

export function addBenefitEnrollmentDependent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollmentDependent>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["addBenefitEnrollmentDependent"],
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
					operationId: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD,
				}),
			),
	});
}

export function endBenefitEnrollmentDependent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollmentDependent>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["endBenefitEnrollmentDependent"],
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
					operationId: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END,
				}),
			),
	});
}
