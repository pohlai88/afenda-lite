import type { Role } from "./session";

/**
 * Coarse shell role hierarchy (ARCH-026).
 * `admin` satisfies `operator`; `client` is exclusive.
 */
export function roleSatisfies(actual: Role, required: Role): boolean {
	switch (required) {
		case "admin":
			return actual === "admin";
		case "operator":
			return actual === "operator" || actual === "admin";
		case "client":
			return actual === "client";
		default: {
			const _exhaustive: never = required;
			throw new Error(`@afenda/auth: unhandled role: ${_exhaustive}`);
		}
	}
}
