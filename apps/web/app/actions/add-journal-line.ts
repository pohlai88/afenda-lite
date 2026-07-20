"use server";

import { addJournalLine, type JournalLine } from "@afenda/accounting";
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

export type AddJournalLineActionState = ActionResult<{
	line: JournalLine;
}> | null;

const schema = z.object({
	journalId: z.string().uuid(),
	accountCode: z.string().trim().min(1).max(64),
	description: z.preprocess(
		(value) => (value === "" ? undefined : value),
		z.string().trim().min(1).max(512).optional(),
	),
	debit: z.coerce.number().nonnegative(),
	credit: z.coerce.number().nonnegative(),
});

export async function addJournalLineAction(
	_prev: AddJournalLineActionState,
	formData: FormData,
): Promise<AddJournalLineActionState> {
	return runOperatorPermissionAction({
		path: "addJournalLineAction",
		permission: "accounting.journal.create",
		safeMessage: "Could not add journal line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				journalId: formData.get("journalId"),
				accountCode: formData.get("accountCode"),
				description: formData.get("description"),
				debit: formData.get("debit"),
				credit: formData.get("credit"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid journal line.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await addJournalLine(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						debit: String(parsed.data.debit),
						credit: String(parsed.data.credit),
						journalId: parsed.data.journalId,
						accountCode: parsed.data.accountCode,
						description: parsed.data.description ?? null,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/accounting");
			revalidatePath("/client/accounting");
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
