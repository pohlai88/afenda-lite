"use server";

import type { Result } from "@afenda/errors/result";
import type { SupplierInvoice } from "@afenda/payables";
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

export type VersionedSupplierInvoiceActionState = ActionResult<{
	invoice: SupplierInvoice;
}> | null;

const versionedSchema = z.object({
	invoiceId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

type VersionedMutation = (
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		invoiceId: string;
		expectedVersion: number;
	},
	options: ReturnType<typeof createPayablesCommandOptions>,
) => Promise<Result<SupplierInvoice>>;

/**
 * Shared Action path for versioned invoice mutations (post / cancel).
 * Keeps validation copy and revalidation identical across twin Actions.
 */
export async function runVersionedSupplierInvoiceMutation(args: {
	path: string;
	permission: "payables.manage";
	safeMessage: string;
	mutate: VersionedMutation;
	formData: FormData;
}): Promise<VersionedSupplierInvoiceActionState> {
	return runOperatorPermissionAction({
		path: args.path,
		permission: args.permission,
		safeMessage: args.safeMessage,
		execute: async (session, correlationId) => {
			const parsed = parseSchema(versionedSchema, {
				invoiceId: args.formData.get("invoiceId"),
				expectedVersion: args.formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice and expected version.",
					parsed.details,
				);
			}
			const mapped = mapPackageResult(
				await args.mutate(
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
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
