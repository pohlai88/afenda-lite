/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { aliasesFor } from "../aliases";
import { defineError } from "../define-error";
import { noPublicDetails, validationDetails } from "../details";

const BAD_REQUEST = defineError({
	aliases: aliasesFor("BAD_REQUEST"),
	category: "request",
	code: "BAD_REQUEST",
	details: noPublicDetails(),
	http: { status: 400 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "The request could not be processed",
		headers: {},
	},
	operations: { operational: true, severity: "info" },
	public: {
		defaultMessage: "The request could not be processed",
		messageKey: "errors.badRequest",
		messagePolicy: "sanitized-override",
	},
	retry: { retryAfter: "never", retryable: false },
});

const VALIDATION_ERROR = defineError({
	aliases: aliasesFor("VALIDATION_ERROR"),
	category: "request",
	code: "VALIDATION_ERROR",
	details: validationDetails(),
	http: { status: 422 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "The request contains invalid field values",
		headers: {},
	},
	operations: { operational: true, severity: "info" },
	public: {
		defaultMessage: "The request contains invalid data",
		messageKey: "errors.validationError",
		messagePolicy: "sanitized-override",
	},
	retry: { retryAfter: "never", retryable: false },
});

export const REQUEST_ERROR_DEFINITIONS = Object.freeze({
	BAD_REQUEST,
	VALIDATION_ERROR,
});
