import { errorResult, type Result } from "@afenda/errors";
import type { Position, PositionOccupancyAsOf } from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
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
} from "../../kernel/operations/module-ids";
import type { PositionDefinitionAtAsOf } from "./organization-structure-lineage";
import { runOrganizationCommand, runOrganizationQuery } from "./run-operation";
import {
	createPositionInputSchema,
	getPositionAsOfInputSchema,
	getPositionInputSchema,
	getPositionOccupancyAsOfInputSchema,
	listPositionsInputSchema,
	positionStatusTransitionInputSchema,
	updatePositionInputSchema,
} from "./schema";

export function createPosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: createPositionInputSchema,
		invalidMessage: "Invalid position create input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
		storeMethods: ["createPosition"],
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
					operationId: HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
				}),
			),
	});
}

export function updatePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: updatePositionInputSchema,
		invalidMessage: "Invalid position update input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
		storeMethods: ["updatePosition"],
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
					operationId: HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
				}),
			),
	});
}

export function activatePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: positionStatusTransitionInputSchema,
		invalidMessage: "Invalid position activate input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
		storeMethods: ["setPositionStatus"],
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
					operationId: HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
				}),
			),
	});
}

export function freezePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: positionStatusTransitionInputSchema,
		invalidMessage: "Invalid position freeze input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
		storeMethods: ["setPositionStatus"],
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
					operationId: HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
				}),
			),
	});
}

export function closePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationCommand(input, options, {
		schema: positionStatusTransitionInputSchema,
		invalidMessage: "Invalid position close input",
		command: HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
		storeMethods: ["setPositionStatus"],
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
					operationId: HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
				}),
			),
	});
}

export function getPosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	return runOrganizationQuery(input, options, {
		schema: getPositionInputSchema,
		invalidMessage: "Invalid position get input",
		query: HUMAN_RESOURCES_QUERY_POSITION_GET,
		storeMethods: ["getPositionById"],
		execute: async (data, { store }) => {
			const position = await store.getPositionById({
				organizationId: data.organizationId,
				positionId: data.positionId,
			});
			if (!position.ok) {
				return position;
			}
			if (position.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(position.data);
		},
	});
}

export function getPositionAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PositionDefinitionAtAsOf>> {
	return runOrganizationQuery(input, options, {
		schema: getPositionAsOfInputSchema,
		invalidMessage: "Invalid position as-of input",
		query: HUMAN_RESOURCES_QUERY_POSITION_AS_OF,
		storeMethods: ["findPositionAsOf"],
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(position.data);
		},
	});
}

export function getPositionOccupancyAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PositionOccupancyAsOf>> {
	return runOrganizationQuery(input, options, {
		schema: getPositionOccupancyAsOfInputSchema,
		invalidMessage: "Invalid position occupancy input",
		query: HUMAN_RESOURCES_QUERY_POSITION_OCCUPANCY_AS_OF,
		storeMethods: ["resolvePositionOccupancyAsOf"],
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(occupancy.data);
		},
	});
}

export function listPositions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ positions: Position[]; totalCount: number }>> {
	return runOrganizationQuery(input, options, {
		schema: listPositionsInputSchema,
		invalidMessage: "Invalid position list input",
		query: HUMAN_RESOURCES_QUERY_POSITION_LIST,
		storeMethods: ["listPositions"],
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
