import "server-only";

import { getNeonAuth } from "./neon-auth";

/**
 * Neon Auth credential outcomes for Path A (app UI + SDK).
 * Maps to web `ActionResult` at the Server Action boundary — not a parallel API envelope.
 */
export type CredentialAuthResult =
	| { ok: true }
	| { ok: false; message: string; code?: string };

function toFailure(error: {
	message?: string | null;
	code?: string | null;
}): CredentialAuthResult {
	const message =
		typeof error.message === "string" && error.message.trim().length > 0
			? error.message.trim()
			: "Authentication failed.";
	const code =
		typeof error.code === "string" && error.code.trim().length > 0
			? error.code.trim()
			: undefined;
	return code === undefined
		? { ok: false, message }
		: { ok: false, message, code };
}

/** Email/password sign-in via Managed Better Auth server SDK. */
export async function signInWithEmail(input: {
	email: string;
	password: string;
}): Promise<CredentialAuthResult> {
	const { error } = await getNeonAuth().signIn.email({
		email: input.email,
		password: input.password,
	});
	if (error) {
		return toFailure(error);
	}
	return { ok: true };
}

/** Email/password sign-up via Managed Better Auth server SDK. */
export async function signUpWithEmail(input: {
	email: string;
	password: string;
	name: string;
}): Promise<CredentialAuthResult> {
	const { error } = await getNeonAuth().signUp.email({
		email: input.email,
		password: input.password,
		name: input.name,
	});
	if (error) {
		return toFailure(error);
	}
	return { ok: true };
}

/** Clears the Neon Auth session cookies for the current request. */
export async function signOutSession(): Promise<CredentialAuthResult> {
	const { error } = await getNeonAuth().signOut();
	if (error) {
		return toFailure(error);
	}
	return { ok: true };
}
