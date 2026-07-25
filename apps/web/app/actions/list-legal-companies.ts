"use server";

import {
	CA_PERMISSION_COMPANY_LIST,
	type CaLegalCompany,
	listLegalCompanies,
} from "@afenda/corporate-administration";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { CA_LEGAL_COMPANY_STATUS_VALUES } from "@/lib/erp/corporate-administration-action-schemas";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const listLegalCompaniesActionSchema = z
	.object({
		status: z.enum(CA_LEGAL_COMPANY_STATUS_VALUES).optional(),
		query: z.string().trim().max(300).optional(),
		cursor: z.string().trim().min(1).optional(),
		limit: z.number().int().positive().max(100).optional(),
	})
	.optional();

export async function listLegalCompaniesAction(input?: {
	status?: CaLegalCompany["status"];
	query?: string;
	cursor?: string;
	limit?: number;
}): Promise<
	ActionResult<{
		companies: readonly CaLegalCompany[];
		total: number;
		nextCursor: string | null;
	}>
> {
	return runOperatorPermissionAction({
		path: "listLegalCompaniesAction",
		permission: CA_PERMISSION_COMPANY_LIST,
		safeMessage:
			"Could not list legal companies. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(listLegalCompaniesActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid company filters.",
					parsed.details,
				);
			}
			const result = await listLegalCompanies(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					...parsed.data,
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return {
				ok: true,
				data: {
					companies: mapped.data.items,
					total: mapped.data.total,
					nextCursor: mapped.data.nextCursor,
				},
			};
		},
	});
}
