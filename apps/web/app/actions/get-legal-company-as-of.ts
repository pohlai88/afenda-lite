"use server";

import {
	CA_PERMISSION_COMPANY_READ,
	type CaLegalCompanyAsOf,
	getLegalCompanyAsOf,
} from "@afenda/corporate-administration";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import { caEffectiveAtFromFormDate, caLegalCompanyIdSchema } from "@/lib/erp/corporate-administration-action-schemas";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const getLegalCompanyAsOfActionSchema = z.object({
	legalCompanyId: caLegalCompanyIdSchema,
	asOf: z.string().date(),
});

export async function getLegalCompanyAsOfAction(input: {
	legalCompanyId: string;
	asOf: string;
}): Promise<ActionResult<{ company: CaLegalCompanyAsOf }>> {
	return runOperatorPermissionAction({
		path: "getLegalCompanyAsOfAction",
		permission: CA_PERMISSION_COMPANY_READ,
		safeMessage:
			"Could not load legal company as of date. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(getLegalCompanyAsOfActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid company and as-of date.",
					parsed.details,
				);
			}
			const result = await getLegalCompanyAsOf(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					legalCompanyId: parsed.data.legalCompanyId,
					asOf: caEffectiveAtFromFormDate(parsed.data.asOf),
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { company: mapped.data } };
		},
	});
}
