"use server";

import { hireFromAcceptedOffer } from "@afenda/human-resources";
import type { HireFromAcceptedOfferResult } from "@afenda/human-resources";
import { hireFromAcceptedOfferInputSchema } from "@afenda/human-resources/schemas";

import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";


const hireFromAcceptedOfferActionSchema = hrActionSchema(hireFromAcceptedOfferInputSchema);

export async function hireFromAcceptedOfferAction(input: unknown): Promise<ActionResult<{ result: HireFromAcceptedOfferResult }>> {
	return runOperatorPermissionAction({
		path: "hireFromAcceptedOfferAction",
		permission: "human-resources.hire.orchestrate",
		safeMessage: "Could not hire from accepted offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(hireFromAcceptedOfferActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid hire from accepted offer request.",
					parsed.details,
				);
			}
			const result = await hireFromAcceptedOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { result: mapped.data } };
		},
	});
}
