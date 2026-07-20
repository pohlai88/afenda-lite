"use server";

import { type Journal, postJournal } from "@afenda/accounting";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type PostJournalActionState = ActionResult<{ journal: Journal }> | null;
const schema = z.object({
	journalId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function postJournalAction(
	_prev: PostJournalActionState,
	formData: FormData,
): Promise<PostJournalActionState> {
	return runOperatorPermissionAction({
		path: "postJournalAction",
		permission: "accounting.journal.post",
		safeMessage: "Could not post journal. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				journalId: formData.get("journalId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid journal and version.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await postJournal(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/accounting");
			revalidatePath("/client/accounting");
			return { ok: true, data: { journal: mapped.data } };
		},
	});
}
