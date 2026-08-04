"use server";

import { type Journal, reverseJournal } from "@afenda/accounting";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ReverseJournalActionState = ActionResult<{
	journal: Journal;
}> | null;
const schema = z.object({
	journalId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	reason: z.string().trim().min(1).max(512),
});

export async function reverseJournalAction(
	_prev: ReverseJournalActionState,
	formData: FormData,
): Promise<ReverseJournalActionState> {
	return await runOperatorPermissionAction({
		path: "reverseJournalAction",
		permission: "accounting.journal.reverse",
		safeMessage: "Could not reverse journal. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				journalId: formData.get("journalId"),
				expectedVersion: formData.get("expectedVersion"),
				reason: formData.get("reason"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid journal, version, and reason.",
				});
			}
			const mapped = mapPackageResult(
				await reverseJournal(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/accounting");
			revalidatePath("/client/accounting");
			return { ok: true, data: { journal: mapped.data } };
		},
	});
}
