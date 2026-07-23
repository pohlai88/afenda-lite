import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
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
} from "../module-ids";
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
} from "../schemas/time";
import { invalidInput } from "../shared/domain-guards";
import { previousIsoDate } from "../shared/effective-dates";
import { runTimeCommand, runTimeQuery } from "../shared/time-command";
import { computeIsOvernight } from "../shared/time-guards";
import type { Shift, ShiftBreak } from "../types";

export async function createShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift>> {
	return runTimeCommand(input, options, {
		schema: createShiftInputSchema,
		invalidMessage: "Invalid shift create input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
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
			if (!existing.ok) return existing;
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.shift);
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
	return runTimeCommand(input, options, {
		schema: updateShiftInputSchema,
		invalidMessage: "Invalid shift update input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
		execute: async (data, { store, ports }) => store.updateShift(data, ports),
	});
}

export async function supersedeShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ superseded: Shift; successor: Shift }>> {
	return runTimeCommand(input, options, {
		schema: supersedeShiftInputSchema,
		invalidMessage: "Invalid shift supersede input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_SUPERSEDE,
		execute: async (data, { store, ports }) => {
			const predecessor = await store.getShift({
				organizationId: data.organizationId,
				shiftId: data.shiftId,
			});
			if (!predecessor.ok) return predecessor;
			if (predecessor.data === null) return invalidInput("Shift was not found");
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
					data.minDurationMinutes !== undefined
						? data.minDurationMinutes
						: predecessor.data.minDurationMinutes,
				maxDurationMinutes:
					data.maxDurationMinutes !== undefined
						? data.maxDurationMinutes
						: predecessor.data.maxDurationMinutes,
				earliestClockInLocal:
					data.earliestClockInLocal !== undefined
						? data.earliestClockInLocal
						: predecessor.data.earliestClockInLocal,
				latestClockOutLocal:
					data.latestClockOutLocal !== undefined
						? data.latestClockOutLocal
						: predecessor.data.latestClockOutLocal,
				overtimeEligible:
					data.overtimeEligible ?? predecessor.data.overtimeEligible,
				timezone:
					data.timezone !== undefined
						? data.timezone
						: predecessor.data.timezone,
				locationKey:
					data.locationKey !== undefined
						? data.locationKey
						: predecessor.data.locationKey,
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
			if (!replay.ok) return replay;
			if (replay.data !== null) {
				if (replay.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				if (replay.data.shift.supersedesShiftId !== data.shiftId) {
					return invalidInput("Stored successor has no matching predecessor");
				}
				const superseded = await store.getShift({
					organizationId: data.organizationId,
					shiftId: data.shiftId,
				});
				if (!superseded.ok) return superseded;
				if (superseded.data === null) {
					return invalidInput("Stored predecessor was not found");
				}
				return ok({
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
	return runTimeCommand(input, options, {
		schema: activateShiftInputSchema,
		invalidMessage: "Invalid shift activate input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
		execute: async (data, { store, ports }) => store.activateShift(data, ports),
	});
}

export async function deactivateShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift>> {
	return runTimeCommand(input, options, {
		schema: deactivateShiftInputSchema,
		invalidMessage: "Invalid shift deactivate input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
		execute: async (data, { store, ports }) =>
			store.deactivateShift(data, ports),
	});
}

export async function getShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Shift | null>> {
	return runTimeQuery(input, options, {
		schema: getShiftInputSchema,
		invalidMessage: "Invalid shift get input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_GET,
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
	return runTimeQuery(input, options, {
		schema: listShiftsInputSchema,
		invalidMessage: "Invalid shift list input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_LIST,
		execute: async (data, { store }) => store.listShifts(data),
	});
}

export async function addShiftBreak(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftBreak>> {
	return runTimeCommand(input, options, {
		schema: addShiftBreakInputSchema,
		invalidMessage: "Invalid shift break add input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
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
	return runTimeCommand(input, options, {
		schema: removeShiftBreakInputSchema,
		invalidMessage: "Invalid shift break remove input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
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
	return runTimeQuery(input, options, {
		schema: listShiftBreaksInputSchema,
		invalidMessage: "Invalid shift break list input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_BREAK_LIST,
		execute: async (data, { store }) => store.listShiftBreaks(data),
	});
}
