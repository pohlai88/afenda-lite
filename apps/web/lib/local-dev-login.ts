import { env, isVercelRuntimeNow } from "@afenda/env";

export type LocalDevLoginRole = "operator" | "client";

export type LocalDevLoginAvailability = {
	operator: boolean;
	client: boolean;
};

/**
 * Local `next dev` only — never Vercel, never production NODE_ENV.
 */
export function isLocalDevLoginRuntime(
	nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
	return nodeEnv === "development" && !isVercelRuntimeNow();
}

export function getLocalDevLoginAvailability(): LocalDevLoginAvailability {
	if (!isLocalDevLoginRuntime()) {
		return { operator: false, client: false };
	}
	return {
		operator:
			typeof env.SHARED_ADMIN_EMAIL === "string" &&
			env.SHARED_ADMIN_EMAIL.length > 0 &&
			typeof env.SHARED_ADMIN_PASSWORD === "string" &&
			env.SHARED_ADMIN_PASSWORD.length > 0,
		client:
			typeof env.PREVIEW_CLIENT_EMAIL === "string" &&
			env.PREVIEW_CLIENT_EMAIL.length > 0 &&
			typeof env.PREVIEW_CLIENT_PASSWORD === "string" &&
			env.PREVIEW_CLIENT_PASSWORD.length > 0,
	};
}

export function hasAnyLocalDevLogin(
	availability: LocalDevLoginAvailability = getLocalDevLoginAvailability(),
): boolean {
	return availability.operator || availability.client;
}
