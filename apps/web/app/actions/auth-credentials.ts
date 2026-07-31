"use server";

import { authServer } from "@afenda/auth";
import {
	type Result as ActionResult,
	errorIngress,
	errorProject,
	errorResult,
} from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { rateLimit } from "@afenda/rate-limit";
import { redirect } from "next/navigation";
import { signInSchema } from "@/modules/identity/schemas/auth";
import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";
import { parseSchema } from "@/modules/platform/schemas/common";

const AUTH_SIGN_IN_PATH = authServer.paths.login;

export interface SignInActionData {
	redirected: true;
}
export type SignInActionState = ActionResult<SignInActionData> | null;

function mapCredentialFailure(
	result: { ok: false; message: string; code?: string },
	correlationId: string,
): ActionResult<never> {
	if (result.code?.startsWith("NETWORK_")) {
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
	return errorResult.fail("UNAUTHORIZED");
}

function resolvePostAuthRedirect(rawCallback: string | undefined): string {
	if (!rawCallback) {
		return "/";
	}
	return authServer.paths.postLogin.sanitizeCallback(rawCallback) ?? "/";
}

/**
 * Path A — email/password sign-in via `@afenda/auth` → Neon Auth SDK.
 * Success redirects to sanitized callback or `/` (post-login bounce hub).
 */
export async function signInAction(
	_prev: SignInActionState,
	formData: FormData,
): Promise<SignInActionState> {
	const correlationId = http.correlation.create();
	const attribution = await readRequestAttribution();

	// Limit before schema parse so invalid-email sprays still consume budget.
	const emailRaw = formData.get("email");
	const limit = await rateLimit.check({
		bucket: "auth_sign_in",
		identity: {
			kind: "credentials",
			ipAddress: attribution.ipAddress,
			email: typeof emailRaw === "string" ? emailRaw : undefined,
		},
	});
	if (!limit.ok) {
		const error = rateLimit.project.failure(limit);
		const diagnostics = rateLimit.project.diagnostics(limit);
		logger.event({
			level: "warn",
			event:
				diagnostics.outcome === "unavailable"
					? "auth_sign_in.rate_limit_unavailable"
					: "auth_sign_in.rate_limited",
			correlationId,
			path: AUTH_SIGN_IN_PATH,
			code: errorProject.diagnostics(error).code,
		});
		return errorProject.result(
			errorIngress.unknown(error, { operation: "web.action" }),
		);
	}

	const parsed = parseSchema(signInSchema, {
		email: formData.get("email"),
		password: formData.get("password"),
		callback:
			formData.get(authServer.paths.postLogin.callbackParameter) || undefined,
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid email and password.",
		});
	}

	const result = await authServer.credentials.signInWithEmail({
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
	await authServer.credentials.signOut();
	redirect(authServer.paths.login);
}
