"use server";

import { revalidatePath } from "next/cache";

import { requireClientDeclarationActionSession } from "@/app/actions/client-declaration-action-session";
import {
	getClientDeclarationDraft,
	saveClientDeclarationDraft,
} from "@/modules/declarations/domain/declaration-draft";
import {
	declarationDraftQuerySchema,
	saveClientDeclarationDraftSchema,
} from "@/modules/declarations/schemas/client";
import { createCorrelationId } from "@/modules/platform/observability/correlation";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
	actionOk,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type LoadDeclarationDraftData = {
	assignmentId: string;
	answers: Record<string, boolean | string>;
	stepIndex: number;
	savedAt: string | null;
};

export type SaveDeclarationDraftData = {
	savedAt: string;
};

/**
 * Load client declaration draft for Sheet compose (UI-CAP-07 product port).
 * Mirrors GET `/api/client/declaration-draft` ownership + onboarding gates.
 */
export async function loadDeclarationDraftAction(
	assignmentId: string,
): Promise<ActionResult<LoadDeclarationDraftData>> {
	const correlationId = createCorrelationId();
	const gate = await requireClientDeclarationActionSession("declarations.read");
	if (!gate.ok) {
		return gate;
	}
	const { session: apiSession } = gate;

	const parsed = parseSchema(declarationDraftQuerySchema, { assignmentId });
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"assignmentId must be a UUID.",
			parsed.details,
		);
	}

	let draft: Awaited<ReturnType<typeof getClientDeclarationDraft>>;
	try {
		draft = await getClientDeclarationDraft({
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
			path: "loadDeclarationDraftAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Declaration draft could not be loaded. Try again or contact an admin.",
			correlationId,
		);
	}
	if (!draft) {
		return actionFail("NOT_FOUND", "Declaration draft was not found.");
	}

	return actionOk(draft);
}

/**
 * Save client declaration draft from Sheet form (UI-CAP-07 product port).
 * Answer text is stored under `surveyId` (UUID key) per SurveyAnswers contract.
 */
export async function saveDeclarationDraftAction(
	_prev: ActionResult<SaveDeclarationDraftData> | null,
	formData: FormData,
): Promise<ActionResult<SaveDeclarationDraftData>> {
	const correlationId = createCorrelationId();
	const gate = await requireClientDeclarationActionSession(
		"declarations.manage",
	);
	if (!gate.ok) {
		return gate;
	}
	const { session: apiSession } = gate;

	const assignmentId = String(formData.get("assignmentId") ?? "");
	const surveyId = String(formData.get("surveyId") ?? "");
	const answerText = String(formData.get("answer") ?? "");
	const stepRaw = String(formData.get("stepIndex") ?? "0");
	const stepIndex = Number.parseInt(stepRaw, 10);

	const payload = {
		assignmentId,
		stepIndex: Number.isFinite(stepIndex) ? stepIndex : 0,
		answers: { [surveyId]: answerText },
	};

	const parsed = parseSchema(saveClientDeclarationDraftSchema, payload);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Draft payload failed validation.",
			parsed.details,
		);
	}

	let saved: Awaited<ReturnType<typeof saveClientDeclarationDraft>>;
	try {
		saved = await saveClientDeclarationDraft({
			orgId: apiSession.orgId,
			clientEmail: apiSession.email,
			draft: parsed.data,
		});
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: apiSession.orgId,
			actorUserId: apiSession.userId,
			path: "saveDeclarationDraftAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Declaration draft could not be saved. Try again or contact an admin.",
			correlationId,
		);
	}
	if (!saved.ok) {
		if (saved.reason === "locked") {
			return actionFail(
				"CONFLICT",
				"This declaration is already submitted and cannot be edited.",
			);
		}
		return actionFail("NOT_FOUND", "Declaration draft was not found.");
	}

	logProductEvent({
		level: "info",
		event: "declaration.draft_save",
		correlationId,
		orgId: apiSession.orgId,
		actorUserId: apiSession.userId,
		path: "saveDeclarationDraftAction",
	});

	revalidatePath("/client/declarations");
	revalidatePath(`/client/declarations/${parsed.data.assignmentId}`);
	return actionOk({ savedAt: saved.savedAt });
}
