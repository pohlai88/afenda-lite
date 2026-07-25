"use server";

import {
	CA_PERMISSION_COMPANY_READ,
	type CaLegalCompanyDetail,
	getLegalCompany,
} from "@afenda/corporate-administration";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const getLegalCompanyActionSchema = z.object({
	legalCompanyId: z.string().uuid(),
});

export async function getLegalCompanyAction(input: {
	legalCompanyId: string;
}): Promise<ActionResult<{ company: CaLegalCompanyDetail }>> {
	return runOperatorPermissionAction({
		path: "getLegalCompanyAction",
		permission: CA_PERMISSION_COMPANY_READ,
		safeMessage: "Could not load legal company. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(getLegalCompanyActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid legal company.",
					parsed.details,
				);
			}
			const result = await getLegalCompany(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					legalCompanyId: parsed.data.legalCompanyId,
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { company: mapped.data } };
		},
	});
}
