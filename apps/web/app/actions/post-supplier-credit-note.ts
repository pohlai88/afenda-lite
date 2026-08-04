"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { postSupplierCreditNote, type SupplierInvoice } from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import { parseSchema } from "@/modules/platform/schemas/common";

export type PostSupplierCreditNoteActionState = ActionResult<{
	creditNote: SupplierInvoice;
}> | null;

const schema = z.object({
	creditNoteId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function postSupplierCreditNoteAction(
	_prev: PostSupplierCreditNoteActionState,
	formData: FormData,
): Promise<PostSupplierCreditNoteActionState> {
	return await runOperatorPermissionAction({
		path: "postSupplierCreditNoteAction",
		permission: "payables.manage",
		safeMessage:
			"Could not post supplier credit note. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				creditNoteId: formData.get("creditNoteId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid credit note id and expected version.",
				});
			}
			const mapped = mapPackageResult(
				await postSupplierCreditNote(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePayablesPaths();
			return { ok: true, data: { creditNote: mapped.data } };
		},
	});
}
