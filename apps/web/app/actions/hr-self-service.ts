"use server";

import {
	recordBreakEnd,
	recordBreakStart,
	recordClockIn,
	recordClockOut,
} from "@afenda/human-resources";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const attendanceEventSchema = z.object({
	eventType: z.enum(["clock-in", "clock-out", "break-start", "break-end"]),
	timeZone: z.enum(["Asia/Kuala_Lumpur", "Asia/Singapore", "UTC"]),
});

function localDateAt(instant: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone,
	}).formatToParts(instant);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((entry) => entry.type === type)?.value ?? "";
	return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function recordOwnAttendanceAction(
	_previous: ActionResult<{ eventId: string; eventType: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ eventId: string; eventType: string }>> {
	return runMemberPermissionAction({
		path: "recordOwnAttendanceAction",
		permission: "human-resources.time.attendance.self.record",
		safeMessage: "Could not record attendance. Retry or contact HR.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(attendanceEventSchema, {
				eventType: formData.get("eventType"),
				timeZone: formData.get("timeZone"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Choose a valid attendance event.",
					parsed.details,
				);
			}

			const identity =
				await createHumanResourcesIdentityResolverPort().resolveEmployeeForActor(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
					},
				);
			if (!identity.ok || identity.data === null) {
				return actionFail(
					"FORBIDDEN",
					"Your account is not linked to an active employee record.",
				);
			}

			const occurredAt = new Date();
			const command = {
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				idempotencyKey: crypto.randomUUID(),
				employeeId: identity.data.employeeId,
				occurredAt: occurredAt.toISOString(),
				sourceTimezone: parsed.data.timeZone,
				localWorkDate: localDateAt(occurredAt, parsed.data.timeZone),
			};
			const execute = {
				"clock-in": recordClockIn,
				"clock-out": recordClockOut,
				"break-start": recordBreakStart,
				"break-end": recordBreakEnd,
			}[parsed.data.eventType];
			const result = await execute(
				command,
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;

			revalidatePath("/client/human-resources");
			return {
				ok: true,
				data: {
					eventId: mapped.data.id,
					eventType: parsed.data.eventType,
				},
			};
		},
	});
}
