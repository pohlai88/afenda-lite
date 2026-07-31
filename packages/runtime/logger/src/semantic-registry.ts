export const LOG_FIELD_REGISTRY = {
	event: { required: true },
	correlationId: { required: true },
	orgId: { required: false },
	actorUserId: { required: false },
	path: { required: false },
	method: { required: false },
	module: { required: false },
	code: { required: false },
} as const;

export const LOG_REDACTION_POLICY = {
	censor: "[redacted]",
	fieldNames: [
		"password",
		"secret",
		"token",
		"apiKey",
		"accessToken",
		"refreshToken",
		"authorization",
		"cookie",
		"setCookie",
		"creditCard",
		"cvv",
		"socialSecurityNumber",
		"bankAccount",
	] as const,
} as const;

export const DEFAULT_LOG_SERVICE = "afenda-web";
