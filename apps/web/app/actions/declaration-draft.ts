"use server";

import { getApiSession, requireRole } from "@afenda/auth";
import { revalidatePath } from "next/cache";

import {
	getClientDeclarationDraft,
	isClientOnboardingComplete,
	saveClientDeclarationDraft,
} from "@/modules/declarations/domain/declaration-draft";
import {
	declarationDraftQuerySchema,
	saveClientDeclarationDraftSchema,
} from "@/modules/declarations/schemas/client";
import {
	type ActionResult,
	actionFail,
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
	await requireRole("client");
	const apiSession = await getApiSession();
	if (!apiSession) {
		return actionFail("UNAUTHORIZED", "Authentication required.");
	}

	const onboarded = await isClientOnboardingComplete({
		orgId: apiSession.orgId,
		userId: apiSession.userId,
	});
	if (!onboarded) {
		return actionFail("FORBIDDEN", "Complete client onboarding first.");
	}

	const parsed = parseSchema(declarationDraftQuerySchema, { assignmentId });
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"assignmentId must be a UUID.",
			parsed.details,
		);
	}

	const draft = await getClientDeclarationDraft({
		orgId: apiSession.orgId,
		clientEmail: apiSession.email,
		assignmentId: parsed.data.assignmentId,
	});
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
	await requireRole("client");
	const apiSession = await getApiSession();
	if (!apiSession) {
		return actionFail("UNAUTHORIZED", "Authentication required.");
	}

	const onboarded = await isClientOnboardingComplete({
		orgId: apiSession.orgId,
		userId: apiSession.userId,
	});
	if (!onboarded) {
		return actionFail("FORBIDDEN", "Complete client onboarding first.");
	}

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

	const saved = await saveClientDeclarationDraft({
		orgId: apiSession.orgId,
		clientEmail: apiSession.email,
		draft: parsed.data,
	});
	if (!saved) {
		return actionFail("NOT_FOUND", "Declaration draft was not found.");
	}

	revalidatePath("/client/dashboard");
	return actionOk(saved);
}
