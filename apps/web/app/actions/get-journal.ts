"use server";

import { getJournalById, type Journal } from "@afenda/accounting";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export async function getJournalAction(
	journalId: string,
): Promise<ActionResult<{ journal: Journal }>> {
	return await runOperatorPermissionAction({
		path: "getJournalAction",
		permission: "accounting.journal.read",
		safeMessage: "Could not load journal. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(z.string().uuid(), journalId);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid journal id.",
				});
			}
			const mapped = mapPackageResult(
				await getJournalById(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						journalId: parsed.data,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			if (mapped.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Journal not found",
				});
			}
			return { ok: true, data: { journal: mapped.data } };
		},
	});
}
