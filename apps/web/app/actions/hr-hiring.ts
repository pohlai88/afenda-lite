"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import type { HireFromAcceptedOfferResult } from "@afenda/human-resources";
import {
	hireFromAcceptedOffer,
	hireFromAcceptedOfferInputSchema,
} from "@afenda/human-resources";
import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrWorkforceOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/_runtime/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const hireFromAcceptedOfferActionSchema = hrActionSchema(
	hireFromAcceptedOfferInputSchema,
);

export async function hireFromAcceptedOfferAction(
	input: unknown,
): Promise<ActionResult<{ result: HireFromAcceptedOfferResult }>> {
	return await runOperatorPermissionAction({
		path: "hireFromAcceptedOfferAction",
		permission: "human-resources.hire.orchestrate",
		safeMessage: "Could not hire from accepted offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(hireFromAcceptedOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid hire from accepted offer request.",
				});
			}
			const result = await hireFromAcceptedOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { result: mapped.data } };
		},
	});
}
