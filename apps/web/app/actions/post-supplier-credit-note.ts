"use server";

import { postSupplierCreditNote, type SupplierInvoice } from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
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
	return runOperatorPermissionAction({
		path: "postSupplierCreditNoteAction",
		permission: "payables.manage",
		safeMessage:
			"Could not post supplier credit note. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				creditNoteId: formData.get("creditNoteId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid credit note id and expected version.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await postSupplierCreditNote(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePayablesPaths();
			return { ok: true, data: { creditNote: mapped.data } };
		},
	});
}
