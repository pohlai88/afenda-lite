"use server";

import {
	AUTH_LOGIN_PATH,
	POST_LOGIN_CALLBACK_PARAM,
	sanitizeCallbackUrl,
	signInWithEmail,
	signOutSession,
} from "@afenda/auth";
import { checkRateLimit, toRateLimitAppError } from "@afenda/rate-limit";
import { redirect } from "next/navigation";

import { signInSchema } from "@/modules/identity/schemas/auth";
import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";
import { createCorrelationId } from "@/modules/platform/observability/correlation";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const AUTH_SIGN_IN_PATH = AUTH_LOGIN_PATH;
const UNKNOWN_CLIENT_IP = "unknown";
const INVALID_EMAIL_KEY = "_invalid";

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
function signInRateLimitKey(input: {
	ipAddress: string | undefined;
	emailRaw: FormDataEntryValue | null;
}): string {
	const ip = input.ipAddress?.trim() || UNKNOWN_CLIENT_IP;
	const email =
		typeof input.emailRaw === "string" ? input.emailRaw.trim().toLowerCase() : "";
	return `${ip}:${email.length > 0 ? email : INVALID_EMAIL_KEY}`;
}

export async function signInAction(
	_prev: SignInActionState,
	formData: FormData,
): Promise<SignInActionState> {
	const correlationId = createCorrelationId();
	const attribution = await readRequestAttribution();

	// Limit before schema parse so invalid-email sprays still consume budget.
	const limit = await checkRateLimit({
		bucket: "auth_sign_in",
		key: signInRateLimitKey({
			ipAddress: attribution.ipAddress,
			emailRaw: formData.get("email"),
		}),
	});
	if (!limit.ok) {
		const error = toRateLimitAppError(limit);
		logProductEvent({
			level: "warn",
			event:
				limit.reason === "unavailable"
					? "auth_sign_in.rate_limit_unavailable"
					: "auth_sign_in.rate_limited",
			correlationId,
			path: AUTH_SIGN_IN_PATH,
			code: error.code,
		});
		return actionFail(error.code, error.message, error.details);
	}

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
