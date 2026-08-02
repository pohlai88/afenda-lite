import { errorResult, type Result } from "@afenda/errors";
import type { Shift, ShiftBreak } from "../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { invalidInput } from "../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
	HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
	HUMAN_RESOURCES_QUERY_SHIFT_BREAK_LIST,
	HUMAN_RESOURCES_QUERY_SHIFT_GET,
	HUMAN_RESOURCES_QUERY_SHIFT_LIST,
} from "../../kernel/operations/module-ids";
import { previousIsoDate } from "../../kernel/temporal/effective-dates";
import { computeIsOvernight } from "./guards";
import {
	runTimeCapabilityCommand,
	runTimeCapabilityQuery,
} from "./run-operation";
import {
	activateShiftInputSchema,
	addShiftBreakInputSchema,
	createShiftInputSchema,
	deactivateShiftInputSchema,
	getShiftInputSchema,
	listShiftBreaksInputSchema,
	listShiftsInputSchema,
	removeShiftBreakInputSchema,
	supersedeShiftInputSchema,
	updateShiftInputSchema,
} from "./schema";

export async function createShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: createShiftInputSchema,
		invalidMessage: "Invalid shift create input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
		storeMethods: ["createShift", "findShiftByIdempotencyKey"],
		execute: async (data, { store, ports }) => {
			const isOvernight =
				data.isOvernight ?? computeIsOvernight(data.startLocal, data.endLocal);
			const fingerprint = JSON.stringify({
				code: data.code,
				name: data.name,
				shiftKind: data.shiftKind,
				startLocal: data.startLocal,
				endLocal: data.endLocal,
				isOvernight,
				expectedMinutes: data.expectedMinutes,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			const existing = await store.findShiftByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existing.data.shift);
			}
			return store.createShift(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					shiftKind: data.shiftKind,
					startLocal: data.startLocal,
					endLocal: data.endLocal,
					isOvernight,
					expectedMinutes: data.expectedMinutes,
					graceEarlyMinutes: data.graceEarlyMinutes ?? 0,
					graceLateMinutes: data.graceLateMinutes ?? 0,
					minDurationMinutes: data.minDurationMinutes ?? null,
					maxDurationMinutes: data.maxDurationMinutes ?? null,
					earliestClockInLocal: data.earliestClockInLocal ?? null,
					latestClockOutLocal: data.latestClockOutLocal ?? null,
					overtimeEligible: data.overtimeEligible ?? true,
					timezone: data.timezone ?? null,
					locationKey: data.locationKey ?? null,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function updateShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: updateShiftInputSchema,
		invalidMessage: "Invalid shift update input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
		storeMethods: ["updateShift"],
		execute: async (data, { store, ports }) => store.updateShift(data, ports),
	});
}

export async function supersedeShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ superseded: Shift; successor: Shift }>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: supersedeShiftInputSchema,
		invalidMessage: "Invalid shift supersede input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_SUPERSEDE,
		storeMethods: ["findShiftByIdempotencyKey", "getShift", "supersedeShift"],
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The domain workflow keeps ordered invariant validation and Result mapping explicit.
		execute: async (data, { store, ports }) => {
			const predecessor = await store.getShift({
				organizationId: data.organizationId,
				shiftId: data.shiftId,
			});
			if (!predecessor.ok) {
				return predecessor;
			}
			if (predecessor.data === null) {
				return invalidInput("Shift was not found");
			}
			if (predecessor.data.status !== "active") {
				return invalidInput("Only active shifts can be superseded");
			}
			if (data.effectiveFrom <= predecessor.data.effectiveFrom) {
				return invalidInput(
					"Successor effectiveFrom must be after the predecessor",
				);
			}
			if (
				data.effectiveTo !== undefined &&
				data.effectiveTo !== null &&
				data.effectiveTo < data.effectiveFrom
			) {
				return invalidInput("effectiveTo must be on or after effectiveFrom");
			}
			const startLocal = data.startLocal ?? predecessor.data.startLocal;
			const endLocal = data.endLocal ?? predecessor.data.endLocal;
			const values = {
				code: predecessor.data.code,
				name: data.name ?? predecessor.data.name,
				shiftKind: data.shiftKind ?? predecessor.data.shiftKind,
				startLocal,
				endLocal,
				isOvernight:
					data.isOvernight ?? computeIsOvernight(startLocal, endLocal),
				expectedMinutes:
					data.expectedMinutes ?? predecessor.data.expectedMinutes,
				graceEarlyMinutes:
					data.graceEarlyMinutes ?? predecessor.data.graceEarlyMinutes,
				graceLateMinutes:
					data.graceLateMinutes ?? predecessor.data.graceLateMinutes,
				minDurationMinutes:
					data.minDurationMinutes === undefined
						? predecessor.data.minDurationMinutes
						: data.minDurationMinutes,
				maxDurationMinutes:
					data.maxDurationMinutes === undefined
						? predecessor.data.maxDurationMinutes
						: data.maxDurationMinutes,
				earliestClockInLocal:
					data.earliestClockInLocal === undefined
						? predecessor.data.earliestClockInLocal
						: data.earliestClockInLocal,
				latestClockOutLocal:
					data.latestClockOutLocal === undefined
						? predecessor.data.latestClockOutLocal
						: data.latestClockOutLocal,
				overtimeEligible:
					data.overtimeEligible ?? predecessor.data.overtimeEligible,
				timezone:
					data.timezone === undefined
						? predecessor.data.timezone
						: data.timezone,
				locationKey:
					data.locationKey === undefined
						? predecessor.data.locationKey
						: data.locationKey,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			};
			const fingerprint = JSON.stringify({
				shiftId: data.shiftId,
				expectedVersion: data.expectedVersion,
				...values,
			});
			const replay = await store.findShiftByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				if (replay.data.createRequestFingerprint !== fingerprint) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				if (replay.data.shift.supersedesShiftId !== data.shiftId) {
					return invalidInput("Stored successor has no matching predecessor");
				}
				const superseded = await store.getShift({
					organizationId: data.organizationId,
					shiftId: data.shiftId,
				});
				if (!superseded.ok) {
					return superseded;
				}
				if (superseded.data === null) {
					return invalidInput("Stored predecessor was not found");
				}
				return errorResult.ok({
					superseded: superseded.data,
					successor: replay.data.shift,
				});
			}
			return store.supersedeShift(
				{
					organizationId: data.organizationId,
					shiftId: data.shiftId,
					expectedVersion: data.expectedVersion,
					predecessorEffectiveTo: previousIsoDate(data.effectiveFrom),
					...values,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function activateShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: activateShiftInputSchema,
		invalidMessage: "Invalid shift activate input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
		storeMethods: ["activateShift"],
		execute: async (data, { store, ports }) => store.activateShift(data, ports),
	});
}

export async function deactivateShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: deactivateShiftInputSchema,
		invalidMessage: "Invalid shift deactivate input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
		storeMethods: ["deactivateShift"],
		execute: async (data, { store, ports }) =>
			store.deactivateShift(data, ports),
	});
}

export async function getShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift | null>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: getShiftInputSchema,
		invalidMessage: "Invalid shift get input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_GET,
		storeMethods: ["getShift"],
		execute: async (data, { store }) =>
			store.getShift({
				organizationId: data.organizationId,
				shiftId: data.shiftId,
			}),
	});
}

export async function listShifts(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift[]>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: listShiftsInputSchema,
		invalidMessage: "Invalid shift list input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_LIST,
		storeMethods: ["listShifts"],
		execute: async (data, { store }) => store.listShifts(data),
	});
}

export async function addShiftBreak(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftBreak>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: addShiftBreakInputSchema,
		invalidMessage: "Invalid shift break add input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
		storeMethods: ["addShiftBreak"],
		execute: async (data, { store, ports }) =>
			store.addShiftBreak(
				{
					organizationId: data.organizationId,
					shiftId: data.shiftId,
					breakOrder: data.breakOrder ?? 1,
					startOffsetMinutes: data.startOffsetMinutes ?? null,
					durationMinutes: data.durationMinutes,
					isPaid: data.isPaid ?? false,
					label: data.label ?? null,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function removeShiftBreak(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: removeShiftBreakInputSchema,
		invalidMessage: "Invalid shift break remove input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
		storeMethods: ["removeShiftBreak"],
		execute: async (data, { store, ports }) =>
			store.removeShiftBreak(
				{
					organizationId: data.organizationId,
					breakId: data.breakId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function listShiftBreaks(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftBreak[]>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: listShiftBreaksInputSchema,
		invalidMessage: "Invalid shift break list input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_BREAK_LIST,
		storeMethods: ["listShiftBreaks"],
		execute: async (data, { store }) => store.listShiftBreaks(data),
	});
}
