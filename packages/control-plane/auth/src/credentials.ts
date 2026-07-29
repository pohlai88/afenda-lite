import "server-only";

import { getNeonAuth } from "./neon-auth";

/**
 * Neon Auth credential outcomes for Path A (app UI + SDK).
 * Maps to web `ActionResult` at the Server Action boundary — not a parallel API envelope.
 */
export type CredentialAuthResult =
	| { ok: true }
	| { ok: false; message: string; code?: string };

const AUTHENTICATION_FAILED_MESSAGE = "Invalid email or password.";
const SIGN_OUT_FAILED_MESSAGE = "Sign out failed.";

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === "object" && value !== null;
}

function readStringProperty(value: unknown, key: PropertyKey): string {
	if (!isRecord(value)) {
		return "";
	}
	try {
		const property = Reflect.get(value, key);
		return typeof property === "string" ? property.trim() : "";
	} catch {
		return "";
	}
}

function toFailure(error: unknown, message: string): CredentialAuthResult {
	const rawCode = readStringProperty(error, "code");
	const code =
		rawCode.length > 0 && /^[A-Z0-9_.:-]+$/u.test(rawCode)
			? rawCode
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
		return toFailure(error, AUTHENTICATION_FAILED_MESSAGE);
	}
	return { ok: true };
}

/** Clears the Neon Auth session cookies for the current request. */
export async function signOutSession(): Promise<CredentialAuthResult> {
	const { error } = await getNeonAuth().signOut();
	if (error) {
		return toFailure(error, SIGN_OUT_FAILED_MESSAGE);
	}
	return { ok: true };
}
