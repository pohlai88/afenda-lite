import type { Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_WAIVE,
	HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET,
} from "../module-ids";
import {
	cancelBenefitEnrollmentInputSchema,
	endBenefitEnrollmentInputSchema,
	enrolBenefitInputSchema,
	getApprovedCompensationHandoffInputSchema,
	waiveBenefitInputSchema,
} from "../schemas/compensation";
import { fingerprintBenefitEnrollment } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { ApprovedCompensationHandoff, BenefitEnrollment } from "../types";
import {
	runCompensationCapabilityCommand,
	runCompensationCapabilityQuery,
} from "./run-operation";

export const HUMAN_RESOURCES_AGGREGATE_BENEFIT_ENROLLMENT =
	"benefit_enrollment" as const;
export type HumanResourcesBenefitEnrollmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_BENEFIT_ENROLLMENT;

export function enrolBenefit(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollment>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["enrolBenefit"],
		schema: enrolBenefitInputSchema,
		invalidMessage: "Invalid benefit enrolment input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintBenefitEnrollment({
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				planId: data.planId,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
				employeeContributionAmount: data.employeeContributionAmount ?? null,
				employerContributionAmount: data.employerContributionAmount ?? null,
				contributionCurrencyCode: data.contributionCurrencyCode ?? null,
				contributionFrequency: data.contributionFrequency ?? null,
			});
			return store.enrolBenefit(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					planId: data.planId,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					employeeContributionAmount: data.employeeContributionAmount ?? null,
					employerContributionAmount: data.employerContributionAmount ?? null,
					contributionCurrencyCode: data.contributionCurrencyCode ?? null,
					contributionFrequency: data.contributionFrequency ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
				}),
			);
		},
	});
}

export function endBenefitEnrollment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollment>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["endBenefitEnrollment"],
		schema: endBenefitEnrollmentInputSchema,
		invalidMessage: "Invalid benefit enrolment end input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
		execute: (data, { store, ports }) =>
			store.endBenefitEnrollment(
				{
					organizationId: data.organizationId,
					enrollmentId: data.enrollmentId,
					endsOn: data.endsOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
				}),
			),
	});
}

export function cancelBenefitEnrollment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollment>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["cancelBenefitEnrollment"],
		schema: cancelBenefitEnrollmentInputSchema,
		invalidMessage: "Invalid benefit enrolment cancel input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
		execute: (data, { store, ports }) =>
			store.cancelBenefitEnrollment(
				{
					organizationId: data.organizationId,
					enrollmentId: data.enrollmentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
				}),
			),
	});
}

export function waiveBenefit(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollment>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["waiveBenefit"],
		schema: waiveBenefitInputSchema,
		invalidMessage: "Invalid benefit waiver input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_WAIVE,
		execute: (data, { store, ports }) =>
			store.waiveBenefit(
				{
					organizationId: data.organizationId,
					enrollmentId: data.enrollmentId,
					waiverReason: data.waiverReason,
					effectiveTo: data.effectiveTo ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_WAIVE,
				}),
			),
	});
}

export function getApprovedCompensationHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApprovedCompensationHandoff | null>> {
	return runCompensationCapabilityQuery(input, options, {
		storeMethods: ["getApprovedCompensationHandoff"],
		schema: getApprovedCompensationHandoffInputSchema,
		invalidMessage: "Invalid approved compensation handoff input",
		query: HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET,
		execute: (data, { store }) =>
			store.getApprovedCompensationHandoff({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			}),
	});
}
