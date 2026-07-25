import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
	HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
	HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
	HUMAN_RESOURCES_QUERY_POSITION_AS_OF,
	HUMAN_RESOURCES_QUERY_POSITION_GET,
	HUMAN_RESOURCES_QUERY_POSITION_LIST,
	HUMAN_RESOURCES_QUERY_POSITION_OCCUPANCY_AS_OF,
} from "../module-ids";
import type { PositionDefinitionAtAsOf } from "./organization-structure-lineage";
import {
	createPositionInputSchema,
	getPositionAsOfInputSchema,
	getPositionInputSchema,
	getPositionOccupancyAsOfInputSchema,
	listPositionsInputSchema,
	positionStatusTransitionInputSchema,
	updatePositionInputSchema,
} from "../schemas/organization";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	runOrganizationCommand,
	runOrganizationQuery,
} from "../shared/organization-command";
import type { Position, PositionOccupancyAsOf } from "../types";

export async function createPosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: createPositionInputSchema,
		invalidMessage: "Invalid position create input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
		execute: async (data, { store, ports }) =>
			store.createPosition(
				{
					organizationId: data.organizationId,
					code: data.code.trim(),
					title: data.title.trim(),
					departmentId: data.departmentId,
					jobId: data.jobId,
					status: data.status ?? "active",
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
				}),
			),
	});
}

export async function updatePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: updatePositionInputSchema,
		invalidMessage: "Invalid position update input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updatePosition(
				{
					organizationId: data.organizationId,
					positionId: data.positionId,
					title: data.title?.trim(),
					departmentId: data.departmentId,
					jobId: data.jobId,
					effectiveOn: data.effectiveOn,
					reasonCode: data.reasonCode,
					evidenceRef: data.evidenceRef,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
				}),
			),
	});
}

export async function activatePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: positionStatusTransitionInputSchema,
		invalidMessage: "Invalid position activate input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
		execute: async (data, { store, ports }) =>
			store.setPositionStatus(
				{
					organizationId: data.organizationId,
					positionId: data.positionId,
					status: "active",
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
				}),
			),
	});
}

export async function freezePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: positionStatusTransitionInputSchema,
		invalidMessage: "Invalid position freeze input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
		execute: async (data, { store, ports }) =>
			store.setPositionStatus(
				{
					organizationId: data.organizationId,
					positionId: data.positionId,
					status: "frozen",
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
				}),
			),
	});
}

export async function closePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: positionStatusTransitionInputSchema,
		invalidMessage: "Invalid position close input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
		execute: async (data, { store, ports }) =>
			store.setPositionStatus(
				{
					organizationId: data.organizationId,
					positionId: data.positionId,
					status: "closed",
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
				}),
			),
	});
}

export async function getPosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationQuery(input, options, {
		schema: getPositionInputSchema,
		invalidMessage: "Invalid position get input",
		query: HUMAN_RESOURCES_QUERY_POSITION_GET,
		execute: async (data, { store }) => {
			const position = await store.getPositionById({
				organizationId: data.organizationId,
				positionId: data.positionId,
			});
			if (!position.ok) {
				return position;
			}
			if (position.data === null) {
				return fail(
					"NOT_FOUND",
					"Position not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(position.data);
		},
	});
}

export async function getPositionAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PositionDefinitionAtAsOf>> {
	return runOrganizationQuery(input, options, {
		schema: getPositionAsOfInputSchema,
		invalidMessage: "Invalid position as-of input",
		query: HUMAN_RESOURCES_QUERY_POSITION_AS_OF,
		execute: async (data, { store }) => {
			const position = await store.findPositionAsOf({
				organizationId: data.organizationId,
				positionId: data.positionId,
				asOf: data.asOf,
			});
			if (!position.ok) {
				return position;
			}
			if (position.data === null) {
				return fail(
					"NOT_FOUND",
					"Position not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(position.data);
		},
	});
}

export async function getPositionOccupancyAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PositionOccupancyAsOf>> {
	return runOrganizationQuery(input, options, {
		schema: getPositionOccupancyAsOfInputSchema,
		invalidMessage: "Invalid position occupancy input",
		query: HUMAN_RESOURCES_QUERY_POSITION_OCCUPANCY_AS_OF,
		execute: async (data, { store }) => {
			const occupancy = await store.resolvePositionOccupancyAsOf({
				organizationId: data.organizationId,
				positionId: data.positionId,
				asOf: data.asOf,
			});
			if (!occupancy.ok) {
				return occupancy;
			}
			if (occupancy.data === null) {
				return fail(
					"NOT_FOUND",
					"Position not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(occupancy.data);
		},
	});
}

export async function listPositions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ positions: Position[]; totalCount: number }>> {
	return runOrganizationQuery(input, options, {
		schema: listPositionsInputSchema,
		invalidMessage: "Invalid position list input",
		query: HUMAN_RESOURCES_QUERY_POSITION_LIST,
		execute: async (data, { store }) =>
			store.listPositions({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				departmentId: data.departmentId,
				jobId: data.jobId,
			}),
	});
}
