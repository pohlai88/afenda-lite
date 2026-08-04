/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { aliasesFor } from "../aliases";
import { defineError } from "../define-error";
import { noPublicDetails } from "../details";

const CONFLICT = defineError({
	aliases: aliasesFor("CONFLICT"),
	category: "concurrency",
	code: "CONFLICT",
	details: noPublicDetails(),
	http: { status: 409 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "The operation conflicts with the current state",
		headers: {},
	},
	operations: { operational: true, severity: "warning" },
	public: {
		defaultMessage: "The operation conflicts with the current state",
		messageKey: "errors.conflict",
		messagePolicy: "sanitized-override",
	},
	retry: { retryAfter: "never", retryable: false },
});

const CONCURRENCY_CONFLICT = defineError({
	aliases: aliasesFor("CONCURRENCY_CONFLICT"),
	category: "concurrency",
	code: "CONCURRENCY_CONFLICT",
	details: noPublicDetails(),
	http: { status: 409 },
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "The resource changed during a retryable concurrent operation",
		headers: {},
	},
	operations: { operational: true, severity: "warning" },
	public: {
		defaultMessage:
			"The operation could not be completed because the resource changed",
		messageKey: "errors.concurrencyConflict",
		messagePolicy: "fixed",
	},
	retry: { retryAfter: "never", retryable: true },
});

export const CONCURRENCY_ERROR_DEFINITIONS = Object.freeze({
	CONCURRENCY_CONFLICT,
	CONFLICT,
});
