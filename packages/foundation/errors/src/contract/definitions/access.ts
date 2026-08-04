/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { aliasesFor } from "../aliases";
import { defineError } from "../define-error";
import { noPublicDetails } from "../details";

const UNAUTHORIZED = defineError({
	aliases: aliasesFor("UNAUTHORIZED"),
	category: "authentication",
	code: "UNAUTHORIZED",
	details: noPublicDetails(),
	http: { status: 401 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: { description: "Authentication is required", headers: {} },
	operations: { operational: true, severity: "warning" },
	public: {
		defaultMessage: "Authentication is required",
		messageKey: "errors.unauthorized",
		messagePolicy: "fixed",
	},
	retry: { retryAfter: "never", retryable: false },
});

const FORBIDDEN = defineError({
	aliases: aliasesFor("FORBIDDEN"),
	category: "authorization",
	code: "FORBIDDEN",
	details: noPublicDetails(),
	http: { status: 403 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "The caller is not permitted to perform the operation",
		headers: {},
	},
	operations: { operational: true, severity: "warning" },
	public: {
		defaultMessage: "The operation is not permitted",
		messageKey: "errors.forbidden",
		messagePolicy: "fixed",
	},
	retry: { retryAfter: "never", retryable: false },
});

export const ACCESS_ERROR_DEFINITIONS = Object.freeze({
	FORBIDDEN,
	UNAUTHORIZED,
});
