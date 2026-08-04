/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { aliasesFor } from "../aliases";
import { defineError } from "../define-error";
import { noPublicDetails } from "../details";

const NOT_FOUND = defineError({
	aliases: aliasesFor("NOT_FOUND"),
	category: "resource",
	code: "NOT_FOUND",
	details: noPublicDetails(),
	http: { status: 404 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "The requested resource was not found",
		headers: {},
	},
	operations: { operational: true, severity: "info" },
	public: {
		defaultMessage: "The requested resource was not found",
		messageKey: "errors.notFound",
		messagePolicy: "sanitized-override",
	},
	retry: { retryAfter: "never", retryable: false },
});

export const RESOURCE_ERROR_DEFINITIONS = Object.freeze({ NOT_FOUND });
