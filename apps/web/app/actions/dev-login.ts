"use server";

import { authServer } from "@afenda/auth";
import { env } from "@afenda/env";
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
import {
	getLocalDevLoginAvailability,
	isLocalDevLoginRuntime,
	type LocalDevLoginRole,
} from "@/lib/local-dev-login";
import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";

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
		return { email, password, home: authServer.paths.postLogin.operatorHome };
	}
	if (role === "client" && availability.client) {
		const email = env.PREVIEW_CLIENT_EMAIL;
		const password = env.PREVIEW_CLIENT_PASSWORD;
		if (typeof email !== "string" || typeof password !== "string") {
			return null;
		}
		return { email, password, home: authServer.paths.postLogin.clientHome };
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
	const correlationId = http.correlation.create();

	if (!isLocalDevLoginRuntime()) {
		logger.event({
			level: "warn",
			event: "dev_login.denied_runtime",
			correlationId,
			path: "devLoginAction",
			code: "FORBIDDEN",
		});
		return errorResult.fail("FORBIDDEN");
	}

	const roleRaw = formData.get("role");
	const role: LocalDevLoginRole | null =
		roleRaw === "operator" || roleRaw === "client" ? roleRaw : null;
	if (role === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Choose operator or client login.",
		});
	}

	const credentials = resolveCredentials(role);
	if (credentials === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}

	const attribution = await readRequestAttribution();
	const limit = await rateLimit.check({
		bucket: "auth_sign_in",
		identity: {
			kind: "dev-login",
			ipAddress: attribution.ipAddress,
			role,
		},
	});
	if (!limit.ok) {
		const error = rateLimit.project.failure(limit);
		return errorProject.result(
			errorIngress.unknown(error, { operation: "web.action" }),
		);
	}

	const result = await authServer.credentials.signInWithEmail({
		email: credentials.email,
		password: credentials.password,
	});
	if (!result.ok) {
		if (result.code?.startsWith("NETWORK_")) {
			return errorResult.fail("INTERNAL_ERROR", { correlationId });
		}
		return errorResult.fail("UNAUTHORIZED");
	}

	redirect(credentials.home);
}
