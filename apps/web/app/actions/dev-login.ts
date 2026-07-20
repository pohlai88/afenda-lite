"use server";

import {
	CLIENT_HOME_PATH,
	OPERATOR_HOME_PATH,
	signInWithEmail,
} from "@afenda/auth";
import { env } from "@afenda/env";
import { createCorrelationId } from "@afenda/http";
import { checkRateLimit, toRateLimitAppError } from "@afenda/rate-limit";
import { redirect } from "next/navigation";

import {
	getLocalDevLoginAvailability,
	isLocalDevLoginRuntime,
	type LocalDevLoginRole,
} from "@/lib/local-dev-login";
import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export type DevLoginActionState = ActionResult<{ redirected: true }> | null;

function resolveCredentials(role: LocalDevLoginRole): {
	email: string;
	password: string;
	home: string;
} | null {
	const availability = getLocalDevLoginAvailability();
	if (role === "operator" && availability.operator) {
		const email = env.SHARED_ADMIN_EMAIL;
		const password = env.SHARED_ADMIN_PASSWORD;
		if (typeof email !== "string" || typeof password !== "string") {
			return null;
		}
		return { email, password, home: OPERATOR_HOME_PATH };
	}
	if (role === "client" && availability.client) {
		const email = env.PREVIEW_CLIENT_EMAIL;
		const password = env.PREVIEW_CLIENT_PASSWORD;
		if (typeof email !== "string" || typeof password !== "string") {
			return null;
		}
		return { email, password, home: CLIENT_HOME_PATH };
	}
	return null;
}

/**
 * Local-dev floating login — uses SHARED_ADMIN_* / PREVIEW_CLIENT_* from env.
 * Fail-closed outside local `next dev`.
 */
export async function devLoginAction(
	_prev: DevLoginActionState,
	formData: FormData,
): Promise<DevLoginActionState> {
	const correlationId = createCorrelationId();

	if (!isLocalDevLoginRuntime()) {
		logProductEvent({
			level: "warn",
			event: "dev_login.denied_runtime",
			correlationId,
			path: "devLoginAction",
			code: "FORBIDDEN",
		});
		return actionFail("FORBIDDEN", "Local dev login is unavailable.");
	}

	const roleRaw = formData.get("role");
	const role: LocalDevLoginRole | null =
		roleRaw === "operator" || roleRaw === "client" ? roleRaw : null;
	if (role === null) {
		return actionFail("VALIDATION_ERROR", "Choose operator or client login.");
	}

	const credentials = resolveCredentials(role);
	if (credentials === null) {
		return actionFail(
			"VALIDATION_ERROR",
			`Set ${role === "operator" ? "SHARED_ADMIN_EMAIL/PASSWORD" : "PREVIEW_CLIENT_EMAIL/PASSWORD"} in .env.local.`,
		);
	}

	const attribution = await readRequestAttribution();
	const limit = await checkRateLimit({
		bucket: "auth_sign_in",
		key: `${attribution.ipAddress?.trim() || "unknown"}:dev-login:${role}`,
	});
	if (!limit.ok) {
		const error = toRateLimitAppError(limit);
		return actionFail(error.code, error.message, error.details);
	}

	const result = await signInWithEmail({
		email: credentials.email,
		password: credentials.password,
	});
	if (!result.ok) {
		if (result.code?.startsWith("NETWORK_")) {
			return actionFailInternal(
				"Authentication service is temporarily unavailable.",
				correlationId,
			);
		}
		return actionFail("UNAUTHORIZED", result.message);
	}

	redirect(credentials.home);
}
