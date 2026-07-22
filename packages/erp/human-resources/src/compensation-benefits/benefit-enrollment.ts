import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
	HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET,
} from "../module-ids";
import {
	cancelBenefitEnrollmentInputSchema,
	endBenefitEnrollmentInputSchema,
	enrolBenefitInputSchema,
	getApprovedCompensationHandoffInputSchema,
} from "../schemas";
import {
	runCompensationCommand,
	runCompensationQuery,
} from "../shared/compensation-command";
import { fingerprintBenefitEnrollment } from "../shared/fingerprint";
import type { ApprovedCompensationHandoff, BenefitEnrollment } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_BENEFIT_ENROLLMENT =
	"benefit_enrollment" as const;
export type HumanResourcesBenefitEnrollmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_BENEFIT_ENROLLMENT;

export async function enrolBenefit(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollment>> {
	return runCompensationCommand(input, options, {
		schema: enrolBenefitInputSchema,
		invalidMessage: "Invalid benefit enrolment input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintBenefitEnrollment({
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				planId: data.planId,
				effectiveFrom: data.effectiveFrom,
			});
			return store.enrolBenefit(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					planId: data.planId,
					effectiveFrom: data.effectiveFrom,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function endBenefitEnrollment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollment>> {
	return runCompensationCommand(input, options, {
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
				{ correlationId: data.correlationId },
			),
	});
}

export async function cancelBenefitEnrollment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitEnrollment>> {
	return runCompensationCommand(input, options, {
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
				{ correlationId: data.correlationId },
			),
	});
}

export async function getApprovedCompensationHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApprovedCompensationHandoff | null>> {
	return runCompensationQuery(input, options, {
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
