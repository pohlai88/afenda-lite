"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	changeRequestIdSchema,
	type MergePartiesResult,
	mergeParties,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type MergePartiesActionData = MergePartiesResult;

export type MergePartiesActionState =
	ActionResult<MergePartiesActionData> | null;

const mergeFieldDecisionSchema = z.enum(["source", "target"]);
const partyTokenSchema = z
	.string()
	.regex(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:\d+$/i,
		"Invalid party token",
	);

const mergePartiesFormSchema = z.object({
	changeRequestId: changeRequestIdSchema,
	sourceParty: partyTokenSchema,
	targetParty: partyTokenSchema,
	nameDecision: mergeFieldDecisionSchema.optional(),
});

function splitPartyToken(token: string): { id: string; version: number } {
	const [id, versionRaw] = token.split(":");
	return { id: id ?? "", version: Number(versionRaw) };
}

/**
 * Steward merge Action — requires approved MDG change request (R2).
 */
export async function mergePartiesAction(
	_prev: MergePartiesActionState,
	formData: FormData,
): Promise<MergePartiesActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(mergePartiesFormSchema, {
		changeRequestId: formData.get("changeRequestId"),
		sourceParty: formData.get("sourceParty"),
		targetParty: formData.get("targetParty"),
		nameDecision: formData.get("nameDecision") || undefined,
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide valid source/target parties and an approved change request.",
			parsed.details,
		);
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	const source = splitPartyToken(parsed.data.sourceParty);
	const target = splitPartyToken(parsed.data.targetParty);

	try {
		const result = await mergeParties(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				changeRequestId: parsed.data.changeRequestId,
				sourcePartyId: source.id,
				targetPartyId: target.id,
				sourceExpectedVersion: source.version,
				targetExpectedVersion: target.version,
				fieldDecisions: {
					name: parsed.data.nameDecision,
				},
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (mapped.ok) {
			revalidatePath("/admin/master-data");
			revalidatePath("/client/master-data");
		}
		return mapped;
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "mergePartiesAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not merge parties. Try again or contact an admin.",
			correlationId,
		);
	}
}
