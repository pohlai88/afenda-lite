"use server";

import { getApiSession, requireRole } from "@afenda/auth";
import { revalidatePath } from "next/cache";

import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { isClientOnboardingComplete } from "@/modules/declarations/domain/declaration-draft";
import { submitClientDeclaration } from "@/modules/declarations/domain/submit-client-declaration";
import { submitClientDeclarationSchema } from "@/modules/declarations/schemas/client";
import {
	type ActionResult,
	actionFail,
	actionOk,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type SubmitClientDeclarationData = {
	assignmentId: string;
	status: "submitted";
	confirmationCode: string;
	idempotent: boolean;
};

/**
 * Finalize a client declaration assignment (N17).
 * Mirrors draft Action gates: client role · declarations.manage · onboarding · org+email ownership.
 */
export async function submitClientDeclarationAction(
	_prev: ActionResult<SubmitClientDeclarationData> | null,
	formData: FormData,
): Promise<ActionResult<SubmitClientDeclarationData>> {
	await requireRole("client");
	const apiSession = await getApiSession();
	if (!apiSession) {
		return actionFail("UNAUTHORIZED", "Authentication required.");
	}

	const permissionDenied = await forbidUnlessPermission(
		apiSession,
		"declarations.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	const onboarded = await isClientOnboardingComplete({
		orgId: apiSession.orgId,
		userId: apiSession.userId,
	});
	if (!onboarded) {
		return actionFail("FORBIDDEN", "Complete client onboarding first.");
	}

	const assignmentId = String(formData.get("assignmentId") ?? "");
	const parsed = parseSchema(submitClientDeclarationSchema, { assignmentId });
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"assignmentId must be a UUID.",
			parsed.details,
		);
	}

	let outcome: Awaited<ReturnType<typeof submitClientDeclaration>>;
	try {
		outcome = await submitClientDeclaration({
			orgId: apiSession.orgId,
			clientEmail: apiSession.email,
			assignmentId: parsed.data.assignmentId,
		});
	} catch {
		return actionFail(
			"INTERNAL_ERROR",
			"Declaration could not be submitted. Try again or contact an admin.",
		);
	}

	if (!outcome.ok) {
		if (outcome.reason === "empty_answers") {
			return actionFail(
				"VALIDATION_ERROR",
				"Save a draft response before submitting this declaration.",
			);
		}
		return actionFail("NOT_FOUND", "Declaration assignment was not found.");
	}

	revalidatePath("/client/declarations");
	revalidatePath(`/client/declarations/${parsed.data.assignmentId}`);
	return actionOk(outcome.data);
}
