import {
	buildCorsHeaders,
	createCorsConfig,
	handleCorsPreflight,
} from "./cors";
import { buildContentSecurityPolicy } from "./csp";
import {
	applySecurityHeaders,
	createSecurityHeaders,
	createStrictSecurityHeaders,
} from "./headers";

export const security = Object.freeze({
	headers: Object.freeze({
		create: createSecurityHeaders,
		strict: createStrictSecurityHeaders,
		apply: applySecurityHeaders,
	}),
	csp: Object.freeze({ serialize: buildContentSecurityPolicy }),
	cors: Object.freeze({
		resolve: createCorsConfig,
		project: buildCorsHeaders,
		preflight: handleCorsPreflight,
	}),
});

export type {
	BuildCorsHeadersInput,
	CorsConfig,
	HandleCorsPreflightInput,
	ResolvedCorsConfig,
} from "./cors";
export type { CspDirectives } from "./csp";
export type { SecurityHeader, SecurityHeadersOptions } from "./headers";
