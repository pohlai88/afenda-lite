import { env } from "@afenda/env";

export type LocalAuthCredentialPair = {
	email: string;
	password: string;
};

export type LocalAuthCredentials = {
	operator: LocalAuthCredentialPair;
	previewClient: LocalAuthCredentialPair;
};

/**
 * Local-only operator + preview-client credentials for `/auth/login` autofill.
 * Returns null outside development or when any required env value is missing.
 * Never exposes passwords via `NEXT_PUBLIC_*`.
 */
export function resolveLocalAuthCredentials(): LocalAuthCredentials | null {
	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	const operatorEmail = env.SHARED_ADMIN_EMAIL;
	const operatorPassword = env.SHARED_ADMIN_PASSWORD;
	const previewEmail = env.PREVIEW_CLIENT_EMAIL;
	const previewPassword = env.PREVIEW_CLIENT_PASSWORD;

	if (
		!operatorEmail ||
		!operatorPassword ||
		!previewEmail ||
		!previewPassword
	) {
		return null;
	}

	return {
		operator: { email: operatorEmail, password: operatorPassword },
		previewClient: { email: previewEmail, password: previewPassword },
	};
}
