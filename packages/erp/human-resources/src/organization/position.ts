import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requireHumanResourcesCommandPermission,
	requireHumanResourcesQueryPermission,
} from "../authorization";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
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
	HUMAN_RESOURCES_QUERY_POSITION_GET,
	HUMAN_RESOURCES_QUERY_POSITION_LIST,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	createPositionInputSchema,
	getPositionInputSchema,
	listPositionsInputSchema,
	positionStatusTransitionInputSchema,
	updatePositionInputSchema,
} from "../schemas/organization";
import type { Position } from "../types";

export async function createPosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	const parsed = parseHumanResourcesInput(
		createPositionInputSchema,
		input,
		"Invalid position create input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.createPosition(
		{
			organizationId: parsed.data.organizationId,
			code: parsed.data.code.trim(),
			title: parsed.data.title.trim(),
			departmentId: parsed.data.departmentId,
			jobId: parsed.data.jobId,
			status: parsed.data.status ?? "active",
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updatePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	const parsed = parseHumanResourcesInput(
		updatePositionInputSchema,
		input,
		"Invalid position update input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.updatePosition(
		{
			organizationId: parsed.data.organizationId,
			positionId: parsed.data.positionId,
			title: parsed.data.title?.trim(),
			departmentId: parsed.data.departmentId,
			jobId: parsed.data.jobId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function activatePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	const parsed = parseHumanResourcesInput(
		positionStatusTransitionInputSchema,
		input,
		"Invalid position activate input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.setPositionStatus(
		{
			organizationId: parsed.data.organizationId,
			positionId: parsed.data.positionId,
			status: "active",
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function freezePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	const parsed = parseHumanResourcesInput(
		positionStatusTransitionInputSchema,
		input,
		"Invalid position freeze input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.setPositionStatus(
		{
			organizationId: parsed.data.organizationId,
			positionId: parsed.data.positionId,
			status: "frozen",
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function closePosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	const parsed = parseHumanResourcesInput(
		positionStatusTransitionInputSchema,
		input,
		"Invalid position close input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.setPositionStatus(
		{
			organizationId: parsed.data.organizationId,
			positionId: parsed.data.positionId,
			status: "closed",
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getPosition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Position>> {
	const parsed = parseHumanResourcesInput(
		getPositionInputSchema,
		input,
		"Invalid position get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_POSITION_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const position = await store.getPositionById({
		organizationId: parsed.data.organizationId,
		positionId: parsed.data.positionId,
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
}

export async function listPositions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ positions: Position[]; totalCount: number }>> {
	const parsed = parseHumanResourcesInput(
		listPositionsInputSchema,
		input,
		"Invalid position list input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_POSITION_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return store.listPositions({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page ?? 1,
		pageSize: parsed.data.pageSize ?? 20,
		status: parsed.data.status,
		departmentId: parsed.data.departmentId,
		jobId: parsed.data.jobId,
	});
}
