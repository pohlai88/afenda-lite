"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	type ChangeRequest,
	partyIdSchema,
	submitChangeRequest,
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

export type SubmitChangeRequestActionData = {
	changeRequest: ChangeRequest;
};

export type SubmitChangeRequestActionState =
	ActionResult<SubmitChangeRequestActionData> | null;

const mergeFieldDecisionSchema = z.enum(["source", "target"]);

const submitChangeRequestFormSchema = z.discriminatedUnion("commandKind", [
	z.object({
		commandKind: z.literal("activate_party"),
		partyId: partyIdSchema,
	}),
	z.object({
		commandKind: z.literal("merge_parties"),
		sourcePartyId: partyIdSchema,
		targetPartyId: partyIdSchema,
		nameDecision: mergeFieldDecisionSchema.optional(),
	}),
]);

/**
 * Submit MDG change request (maker) — `master_data.manage`.
 */
export async function submitChangeRequestAction(
	_prev: SubmitChangeRequestActionState,
	formData: FormData,
): Promise<SubmitChangeRequestActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const commandKind = formData.get("commandKind");
	const parsed = parseSchema(submitChangeRequestFormSchema, {
		commandKind,
		partyId: formData.get("partyId") || undefined,
		sourcePartyId: formData.get("sourcePartyId") || undefined,
		targetPartyId: formData.get("targetPartyId") || undefined,
		nameDecision: formData.get("nameDecision") || undefined,
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid change request command.",
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

	try {
		const input =
			parsed.data.commandKind === "activate_party"
				? {
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						commandKind: "activate_party" as const,
						payload: { partyId: parsed.data.partyId },
					}
				: {
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						commandKind: "merge_parties" as const,
						payload: {
							sourcePartyId: parsed.data.sourcePartyId,
							targetPartyId: parsed.data.targetPartyId,
							fieldDecisions: {
								name: parsed.data.nameDecision,
							},
						},
					};

		const result = await submitChangeRequest(input, {
			authorization: createMasterDataAuthorizationPort(),
		});
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { changeRequest: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "submitChangeRequestAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not submit change request. Try again or contact an admin.",
			correlationId,
		);
	}
}
