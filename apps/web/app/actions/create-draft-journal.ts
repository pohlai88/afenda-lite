"use server";

import { createDraftJournal, type Journal } from "@afenda/accounting";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateDraftJournalActionState = ActionResult<{
	journal: Journal;
}> | null;

const schema = z.object({
	periodId: z.string().uuid(),
	code: z.string().trim().min(1).max(64),
	currencyCode: z.string().trim().length(3),
	description: z.preprocess(
		(value) => (value === "" ? undefined : value),
		z.string().trim().min(1).max(512).optional(),
	),
});

export async function createDraftJournalAction(
	_prev: CreateDraftJournalActionState,
	formData: FormData,
): Promise<CreateDraftJournalActionState> {
	return await runOperatorPermissionAction({
		path: "createDraftJournalAction",
		permission: "accounting.journal.create",
		safeMessage: "Could not create journal. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				periodId: formData.get("periodId"),
				code: formData.get("code"),
				currencyCode: formData.get("currencyCode"),
				description: formData.get("description"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid journal details.",
				});
			}
			const mapped = mapPackageResult(
				await createDraftJournal(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						description: parsed.data.description ?? null,
						journalType: "manual",
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
