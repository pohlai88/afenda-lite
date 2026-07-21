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
