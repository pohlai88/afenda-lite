import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import {
	HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
	humanResourcesErrorDetails,
} from "./error-codes";

export const humanResourcesEmployeeIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeId">();
export type HumanResourcesEmployeeId = z.infer<
	typeof humanResourcesEmployeeIdSchema
>;

export const humanResourcesEmploymentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmploymentId">();
export type HumanResourcesEmploymentId = z.infer<
	typeof humanResourcesEmploymentIdSchema
>;

export const humanResourcesEmploymentContractIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmploymentContractId">();
export type HumanResourcesEmploymentContractId = z.infer<
	typeof humanResourcesEmploymentContractIdSchema
>;

export const humanResourcesPositionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesPositionId">();
export type HumanResourcesPositionId = z.infer<
	typeof humanResourcesPositionIdSchema
>;

export const humanResourcesAssignmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesAssignmentId">();
export type HumanResourcesAssignmentId = z.infer<
	typeof humanResourcesAssignmentIdSchema
>;

export const humanResourcesDepartmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesDepartmentId">();
export type HumanResourcesDepartmentId = z.infer<
	typeof humanResourcesDepartmentIdSchema
>;

export const humanResourcesJobIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesJobId">();
export type HumanResourcesJobId = z.infer<typeof humanResourcesJobIdSchema>;

export const humanResourcesReportingLineIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesReportingLineId">();
export type HumanResourcesReportingLineId = z.infer<
	typeof humanResourcesReportingLineIdSchema
>;

export const humanResourcesRequisitionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesRequisitionId">();
export type HumanResourcesRequisitionId = z.infer<
	typeof humanResourcesRequisitionIdSchema
>;

export const humanResourcesCandidateIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCandidateId">();
export type HumanResourcesCandidateId = z.infer<
	typeof humanResourcesCandidateIdSchema
>;

export const humanResourcesApplicationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesApplicationId">();
export type HumanResourcesApplicationId = z.infer<
	typeof humanResourcesApplicationIdSchema
>;

export const humanResourcesInterviewIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesInterviewId">();
export type HumanResourcesInterviewId = z.infer<
	typeof humanResourcesInterviewIdSchema
>;

export const humanResourcesInterviewEvaluationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesInterviewEvaluationId">();
export type HumanResourcesInterviewEvaluationId = z.infer<
	typeof humanResourcesInterviewEvaluationIdSchema
>;

export const humanResourcesOfferIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesOfferId">();
export type HumanResourcesOfferId = z.infer<typeof humanResourcesOfferIdSchema>;

/** Brand after UUID generation or trusted DB load — never cast without parse. */
export function parseHumanResourcesEmployeeId(
	id: string,
): Result<HumanResourcesEmployeeId> {
	const parsed = humanResourcesEmployeeIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmploymentId(
	id: string,
): Result<HumanResourcesEmploymentId> {
	const parsed = humanResourcesEmploymentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmploymentContractId(
	id: string,
): Result<HumanResourcesEmploymentContractId> {
	const parsed = humanResourcesEmploymentContractIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment contract identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesPositionId(
	id: string,
): Result<HumanResourcesPositionId> {
	const parsed = humanResourcesPositionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid position identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesAssignmentId(
	id: string,
): Result<HumanResourcesAssignmentId> {
	const parsed = humanResourcesAssignmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid assignment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesDepartmentId(
	id: string,
): Result<HumanResourcesDepartmentId> {
	const parsed = humanResourcesDepartmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid department identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesJobId(
	id: string,
): Result<HumanResourcesJobId> {
	const parsed = humanResourcesJobIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid job identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesReportingLineId(
	id: string,
): Result<HumanResourcesReportingLineId> {
	const parsed = humanResourcesReportingLineIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid reporting line identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesRequisitionId(
	id: string,
): Result<HumanResourcesRequisitionId> {
	const parsed = humanResourcesRequisitionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid requisition identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCandidateId(
	id: string,
): Result<HumanResourcesCandidateId> {
	const parsed = humanResourcesCandidateIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid candidate identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesApplicationId(
	id: string,
): Result<HumanResourcesApplicationId> {
	const parsed = humanResourcesApplicationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid application identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesInterviewId(
	id: string,
): Result<HumanResourcesInterviewId> {
	const parsed = humanResourcesInterviewIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid interview identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesInterviewEvaluationId(
	id: string,
): Result<HumanResourcesInterviewEvaluationId> {
	const parsed = humanResourcesInterviewEvaluationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid interview evaluation identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesOfferId(
	id: string,
): Result<HumanResourcesOfferId> {
	const parsed = humanResourcesOfferIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid offer identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}
