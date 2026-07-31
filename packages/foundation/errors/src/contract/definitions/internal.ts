/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { aliasesFor } from "../aliases";
import { defineError } from "../define-error";
import { internalDetails } from "../details";

const INTERNAL_ERROR = defineError({
	aliases: aliasesFor("INTERNAL_ERROR"),
	category: "internal",
	code: "INTERNAL_ERROR",
	details: internalDetails(),
	http: { status: 500 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "An unexpected internal failure occurred",
		headers: {},
	},
	operations: { operational: false, severity: "error" },
	public: {
		defaultMessage: "An unexpected error occurred",
		messageKey: "errors.internalError",
		messagePolicy: "fixed",
	},
	retry: { retryAfter: "never", retryable: false },
});

export const INTERNAL_ERROR_DEFINITIONS = Object.freeze({ INTERNAL_ERROR });
