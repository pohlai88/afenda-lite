"use server";

import { getJournalById, type Journal } from "@afenda/accounting";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export async function getJournalAction(
	journalId: string,
): Promise<ActionResult<{ journal: Journal }>> {
	return runOperatorPermissionAction({
		path: "getJournalAction",
		permission: "accounting.read",
		safeMessage: "Could not load journal. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(z.string().uuid(), journalId);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid journal id.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await getJournalById(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						id: parsed.data,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			if (mapped.data === null)
				return actionFail("NOT_FOUND", "Journal not found");
			return { ok: true, data: { journal: mapped.data } };
		},
	});
}
