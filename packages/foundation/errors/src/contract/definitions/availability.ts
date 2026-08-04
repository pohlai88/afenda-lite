/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { aliasesFor } from "../aliases";
import { defineError } from "../define-error";
import { noPublicDetails, rateLimitDetails } from "../details";
import { ERROR_RETRY_AFTER_HEADER } from "../openapi-metadata";

const RATE_LIMITED = defineError({
	aliases: aliasesFor("RATE_LIMITED"),
	category: "availability",
	code: "RATE_LIMITED",
	details: rateLimitDetails(),
	http: { status: 429 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "The caller exceeded an enforced request rate",
		headers: {
			"Retry-After": ERROR_RETRY_AFTER_HEADER,
		},
	},
	operations: { operational: true, severity: "warning" },
	public: {
		defaultMessage: "Too many requests. Try again later.",
		messageKey: "errors.rateLimited",
		messagePolicy: "fixed",
	},
	retry: {
		retryAfter: "details.retryAfterSeconds",
		retryable: true,
	},
});

const SERVICE_UNAVAILABLE = defineError({
	aliases: aliasesFor("SERVICE_UNAVAILABLE"),
	category: "availability",
	code: "SERVICE_UNAVAILABLE",
	details: noPublicDetails(),
	http: { status: 503 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "A required service is temporarily unavailable",
		headers: {},
	},
	operations: { operational: true, severity: "error" },
	public: {
		defaultMessage: "A required service is temporarily unavailable.",
		messageKey: "errors.serviceUnavailable",
		messagePolicy: "fixed",
	},
	retry: { retryAfter: "never", retryable: true },
});

export const AVAILABILITY_ERROR_DEFINITIONS = Object.freeze({
	RATE_LIMITED,
	SERVICE_UNAVAILABLE,
});
