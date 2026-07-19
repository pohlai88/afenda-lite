"use server";

import {
	AUTH_LOGIN_PATH,
	POST_LOGIN_CALLBACK_PARAM,
	sanitizeCallbackUrl,
	signInWithEmail,
	signOutSession,
} from "@afenda/auth";
import { redirect } from "next/navigation";

import { signInSchema } from "@/modules/identity/schemas/auth";
import { createCorrelationId } from "@/modules/platform/observability/correlation";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type SignInActionData = { redirected: true };
export type SignInActionState = ActionResult<SignInActionData> | null;

function mapCredentialFailure(
	result: { ok: false; message: string; code?: string },
	correlationId: string,
): ActionResult<never> {
	if (result.code?.startsWith("NETWORK_")) {
		return actionFailInternal(
			"Authentication service is temporarily unavailable.",
			correlationId,
		);
	}
	return actionFail("UNAUTHORIZED", result.message);
}

function resolvePostAuthRedirect(rawCallback: string | undefined): string {
	if (!rawCallback) {
		return "/";
	}
	return sanitizeCallbackUrl(rawCallback) ?? "/";
}

/**
 * Path A — email/password sign-in via `@afenda/auth` → Neon Auth SDK.
 * Success redirects to sanitized callback or `/` (post-login bounce hub).
 */
export async function signInAction(
	_prev: SignInActionState,
	formData: FormData,
): Promise<SignInActionState> {
	const correlationId = createCorrelationId();
	const parsed = parseSchema(signInSchema, {
		email: formData.get("email"),
		password: formData.get("password"),
		callback: formData.get(POST_LOGIN_CALLBACK_PARAM) || undefined,
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid email and password.",
			parsed.details,
		);
	}

	const result = await signInWithEmail({
		email: parsed.data.email,
		password: parsed.data.password,
	});
	if (!result.ok) {
		return mapCredentialFailure(result, correlationId);
	}

	redirect(resolvePostAuthRedirect(parsed.data.callback));
}

/**
 * Path A — sign out via Neon Auth SDK, then land on login.
 * Never returns ActionResult on success (redirect).
 */
export async function signOutAction(): Promise<void> {
	await signOutSession();
	redirect(AUTH_LOGIN_PATH);
}
