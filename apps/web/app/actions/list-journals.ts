"use server";

import { type Journal, listJournals } from "@afenda/accounting";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const schema = z
	.object({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: z.enum(["draft", "posted", "reversed"]).optional(),
		periodId: z.string().uuid().optional(),
	})
	.optional();

export async function listJournalsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: Journal["status"];
	periodId?: string;
}): Promise<ActionResult<{ journals: Journal[] }>> {
	return runOperatorPermissionAction({
		path: "listJournalsAction",
		permission: "accounting.journal.read",
		safeMessage: "Could not list journals. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid journal filters.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await listJournals(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...parsed.data,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { journals: mapped.data } };
		},
	});
}
