import type { Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ELIGIBILITY_SET,
	HUMAN_RESOURCES_QUERY_BENEFIT_PLAN_ELIGIBILITY_GET,
} from "../module-ids";
import {
	getBenefitPlanEligibilityInputSchema,
	setBenefitPlanEligibilityInputSchema,
} from "../schemas/compensation";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { BenefitPlanEligibility } from "../types";
import {
	runCompensationCapabilityCommand,
	runCompensationCapabilityQuery,
} from "./run-operation";

export const HUMAN_RESOURCES_AGGREGATE_BENEFIT_PLAN_ELIGIBILITY =
	"benefit_plan_eligibility" as const;
export type HumanResourcesBenefitPlanEligibilityAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_BENEFIT_PLAN_ELIGIBILITY;

export function setBenefitPlanEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitPlanEligibility>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["setBenefitPlanEligibility"],
		schema: setBenefitPlanEligibilityInputSchema,
		invalidMessage: "Invalid benefit plan eligibility input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ELIGIBILITY_SET,
		execute: (data, { store, ports }) =>
			store.setBenefitPlanEligibility(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					minTenureDays: data.minTenureDays,
					allowedEmploymentStatuses: data.allowedEmploymentStatuses,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ELIGIBILITY_SET,
				}),
			),
	});
}

export function getBenefitPlanEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitPlanEligibility | null>> {
	return runCompensationCapabilityQuery(input, options, {
		storeMethods: ["getBenefitPlanEligibility"],
		schema: getBenefitPlanEligibilityInputSchema,
		invalidMessage: "Invalid benefit plan eligibility query input",
		query: HUMAN_RESOURCES_QUERY_BENEFIT_PLAN_ELIGIBILITY_GET,
		execute: (data, { store }) =>
			store.getBenefitPlanEligibility({
				organizationId: data.organizationId,
				planId: data.planId,
			}),
	});
}
