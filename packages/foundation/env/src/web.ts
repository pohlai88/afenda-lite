import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import {
	approvedNeonBranchIdSchema,
	approvedNeonOrgIdSchema,
	approvedNeonProjectIdSchema,
	assertLocalOnlySecretsAbsentInProduction,
	assertPlaygroundLocalOnly,
	formatNeonContractIssues,
	isProductionDeployment,
	isVercelRuntime,
	neonAuthBaseUrlSchema,
	neonAuthCookieSecretSchema,
	productAppUrlSchema,
	productDatabaseUrlSchema,
} from "./neon-contract";

const boolString = z
	.enum(["true", "false"])
	.transform((value) => value === "true");

const runtimeCtx = {
	nodeEnv: process.env.NODE_ENV,
	vercelEnv: process.env.VERCEL_ENV,
};

/** True when running on a Vercel deployment (preview / production / vercel-dev). */
export function isVercelRuntimeNow(): boolean {
	return isVercelRuntime(runtimeCtx);
}

/**
 * Typed Next.js env for `@afenda/web` (ARCH-027 / T3 createEnv + N1 Neon contract).
 * Product code: `import { env } from '@afenda/env'` — never raw process.env for app config.
 */

export const env = createEnv({
	server: {
		DATABASE_URL: productDatabaseUrlSchema,
		NEON_AUTH_BASE_URL: neonAuthBaseUrlSchema,
		NEON_AUTH_COOKIE_SECRET: neonAuthCookieSecretSchema,
		APP_URL: productAppUrlSchema(runtimeCtx),

		NEON_ORG_ID: approvedNeonOrgIdSchema.optional(),
		NEON_PROJECT_ID: approvedNeonProjectIdSchema.optional(),
		NEON_BRANCH_ID: approvedNeonBranchIdSchema.optional(),
		NEON_API_KEY: z.string().min(1).optional(),

		PORTAL_ORG_SLUG: z.string().min(1).optional(),
		PORTAL_ORG_NAME: z.string().min(1).optional(),
		PORTAL_ORG_SWITCHER_ENABLED: boolString.optional().default(false),
		PORTAL_ORGANIZATION_ID: z.string().min(1).optional(),
		E2E_ORGANIZATION_ID: z.string().min(1).optional(),

		GUARDIAN_AUTH_SHELL: boolString.optional().default(true),

		RESEND_API_KEY: z.string().min(1).optional(),

		/** Upstash Redis REST — required on Vercel production for shared rate limits. */
		UPSTASH_REDIS_REST_URL: z.url().optional(),
		UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

		/**
		 * Bearer token for `GET /api/metrics` Prometheus scrape.
		 * Fail closed when unset — scrape RH returns 404.
		 */
		METRICS_SCRAPE_TOKEN: z.string().min(16).optional(),

		/**
		 * Vercel AI Gateway API key for `@afenda/ai-the-machine`.
		 * Local: required for chat RH. On Vercel, OIDC may apply when unset.
		 */
		AI_GATEWAY_API_KEY: z.string().min(1).optional(),
		/** AI Gateway model id (`provider/model`). */
		AI_THE_MACHINE_MODEL: z.string().min(1).optional(),

		PLAYGROUND_ENABLED: boolString
			.optional()
			.default(false)
			.superRefine((value, ctx) => {
				const result = assertPlaygroundLocalOnly(value, runtimeCtx);
				if (!result.ok) {
					ctx.addIssue({
						code: "custom",
						message: formatNeonContractIssues(result.issues),
					});
				}
			}),
		PLAYGROUND_SURVEY_ID: z.string().min(1).optional(),
		PLAYGROUND_ASSIGNMENT_ID: z.string().min(1).optional(),
		PLAYGROUND_SURVEY_SLUG: z.string().min(1).optional(),

		SHARED_ADMIN_EMAIL: z.email().optional(),
		SHARED_ADMIN_NAME: z.string().min(1).optional(),
		SHARED_ADMIN_PASSWORD: z.string().min(1).optional(),
		PREVIEW_CLIENT_EMAIL: z.email().optional(),
		PREVIEW_CLIENT_NAME: z.string().min(1).optional(),
		PREVIEW_CLIENT_PASSWORD: z.string().min(1).optional(),
		CLIENT_DEFAULT_PASSWORD: z.string().min(1).optional(),
		E2E_OPERATOR_EMAIL: z.email().optional(),
		E2E_OPERATOR_PASSWORD: z.string().min(1).optional(),
		E2E_CLIENT_EMAIL: z.email().optional(),
		E2E_CLIENT_PASSWORD: z.string().min(1).optional(),
		E2E_SURVEY_SLUG: z.string().min(1).optional(),
		E2E_INVITE_TOKEN: z.string().min(1).optional(),

		SHADCN_STUDIO_EMAIL: z.string().min(1).optional(),
		SHADCN_STUDIO_API_KEY: z.string().min(1).optional(),
		LICENSE_KEY: z.string().min(1).optional(),
		EMAIL: z.string().min(1).optional(),
	},
	client: {},
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
		NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
		APP_URL: process.env.APP_URL,

		NEON_ORG_ID: process.env.NEON_ORG_ID,
		NEON_PROJECT_ID: process.env.NEON_PROJECT_ID,
		NEON_BRANCH_ID: process.env.NEON_BRANCH_ID,
		NEON_API_KEY: process.env.NEON_API_KEY,

		PORTAL_ORG_SLUG: process.env.PORTAL_ORG_SLUG,
		PORTAL_ORG_NAME: process.env.PORTAL_ORG_NAME,
		PORTAL_ORG_SWITCHER_ENABLED: process.env.PORTAL_ORG_SWITCHER_ENABLED,
		PORTAL_ORGANIZATION_ID: process.env.PORTAL_ORGANIZATION_ID,
		E2E_ORGANIZATION_ID: process.env.E2E_ORGANIZATION_ID,

		GUARDIAN_AUTH_SHELL: process.env.GUARDIAN_AUTH_SHELL,

		RESEND_API_KEY: process.env.RESEND_API_KEY,

		UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
		UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

		METRICS_SCRAPE_TOKEN: process.env.METRICS_SCRAPE_TOKEN,

		AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
		AI_THE_MACHINE_MODEL: process.env.AI_THE_MACHINE_MODEL,

		PLAYGROUND_ENABLED: process.env.PLAYGROUND_ENABLED,
		PLAYGROUND_SURVEY_ID: process.env.PLAYGROUND_SURVEY_ID,
		PLAYGROUND_ASSIGNMENT_ID: process.env.PLAYGROUND_ASSIGNMENT_ID,
		PLAYGROUND_SURVEY_SLUG: process.env.PLAYGROUND_SURVEY_SLUG,

		SHARED_ADMIN_EMAIL: process.env.SHARED_ADMIN_EMAIL,
		SHARED_ADMIN_NAME: process.env.SHARED_ADMIN_NAME,
		SHARED_ADMIN_PASSWORD: process.env.SHARED_ADMIN_PASSWORD,
		PREVIEW_CLIENT_EMAIL: process.env.PREVIEW_CLIENT_EMAIL,
		PREVIEW_CLIENT_NAME: process.env.PREVIEW_CLIENT_NAME,
		PREVIEW_CLIENT_PASSWORD: process.env.PREVIEW_CLIENT_PASSWORD,
		CLIENT_DEFAULT_PASSWORD: process.env.CLIENT_DEFAULT_PASSWORD,
		E2E_OPERATOR_EMAIL: process.env.E2E_OPERATOR_EMAIL,
		E2E_OPERATOR_PASSWORD: process.env.E2E_OPERATOR_PASSWORD,
		E2E_CLIENT_EMAIL: process.env.E2E_CLIENT_EMAIL,
		E2E_CLIENT_PASSWORD: process.env.E2E_CLIENT_PASSWORD,
		E2E_SURVEY_SLUG: process.env.E2E_SURVEY_SLUG,
		E2E_INVITE_TOKEN: process.env.E2E_INVITE_TOKEN,

		SHADCN_STUDIO_EMAIL: process.env.SHADCN_STUDIO_EMAIL,
		SHADCN_STUDIO_API_KEY: process.env.SHADCN_STUDIO_API_KEY,
		LICENSE_KEY: process.env.LICENSE_KEY,
		EMAIL: process.env.EMAIL,
	},
	emptyStringAsUndefined: true,
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.npm_lifecycle_event === "typecheck",
	createFinalSchema: (shape) =>
		z.object(shape).superRefine((value, ctx) => {
			if (!isProductionDeployment(runtimeCtx)) {
				return;
			}
			const localOnly = assertLocalOnlySecretsAbsentInProduction(
				{
					SHARED_ADMIN_PASSWORD: value.SHARED_ADMIN_PASSWORD,
					PREVIEW_CLIENT_PASSWORD: value.PREVIEW_CLIENT_PASSWORD,
					CLIENT_DEFAULT_PASSWORD: value.CLIENT_DEFAULT_PASSWORD,
					E2E_OPERATOR_PASSWORD: value.E2E_OPERATOR_PASSWORD,
					E2E_CLIENT_PASSWORD: value.E2E_CLIENT_PASSWORD,
				},
				runtimeCtx,
			);
			if (!localOnly.ok) {
				ctx.addIssue({
					code: "custom",
					message: formatNeonContractIssues(localOnly.issues),
				});
			}
		}),
});
