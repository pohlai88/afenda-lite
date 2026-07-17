"use server";

import { revalidatePath } from "next/cache";

import { requireClientDeclarationActionSession } from "@/app/actions/client-declaration-action-session";
import { submitClientDeclaration } from "@/modules/declarations/domain/submit-client-declaration";
import { submitClientDeclarationSchema } from "@/modules/declarations/schemas/client";
import { createCorrelationId } from "@/modules/platform/observability/correlation";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
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
 * Finalize a client declaration assignment (N17 · I5.3 correlation).
 * Mirrors draft Action gates: client role · declarations.manage · onboarding · org+email ownership.
 */
export async function submitClientDeclarationAction(
	_prev: ActionResult<SubmitClientDeclarationData> | null,
	formData: FormData,
): Promise<ActionResult<SubmitClientDeclarationData>> {
	const correlationId = createCorrelationId();
	const gate = await requireClientDeclarationActionSession(
		"declarations.manage",
	);
	if (!gate.ok) {
		return gate;
	}
	const { session: apiSession } = gate;

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
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: apiSession.orgId,
			actorUserId: apiSession.userId,
			path: "submitClientDeclarationAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Declaration could not be submitted. Try again or contact an admin.",
			correlationId,
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

	logProductEvent({
		level: "info",
		event: "declaration.submit",
		correlationId,
		orgId: apiSession.orgId,
		actorUserId: apiSession.userId,
		path: "submitClientDeclarationAction",
	});

	revalidatePath("/client/declarations");
	revalidatePath(`/client/declarations/${parsed.data.assignmentId}`);
	return actionOk(outcome.data);
}
