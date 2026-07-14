import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const boolString = z
	.enum(["true", "false"])
	.transform((value) => value === "true");

/**
 * Typed Next.js env for `@afenda/web` (ARCH-027 / T3 createEnv).
 * Product code: `import { env } from '@afenda/env'` — never raw process.env for app config.
 */
export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		NEON_AUTH_BASE_URL: z.url(),
		NEON_AUTH_COOKIE_SECRET: z.string().min(32),
		APP_URL: z.url(),

		NEON_ORG_ID: z.string().min(1).optional(),
		NEON_PROJECT_ID: z.string().min(1).optional(),
		NEON_BRANCH_ID: z.string().min(1).optional(),
		NEON_API_KEY: z.string().min(1).optional(),

		PORTAL_ORG_SLUG: z.string().min(1).optional(),
		PORTAL_ORG_NAME: z.string().min(1).optional(),
		PORTAL_ORG_SWITCHER_ENABLED: boolString.optional().default(false),
		PORTAL_ORGANIZATION_ID: z.string().min(1).optional(),
		E2E_ORGANIZATION_ID: z.string().min(1).optional(),

		GUARDIAN_AUTH_SHELL: boolString.optional().default(true),

		FFT_RBAC_ENABLED: boolString.optional().default(false),
		FFT_DEPOSIT_ENABLED: boolString.optional().default(false),
		FFT_PICKUP_OPS_ENABLED: boolString.optional().default(false),
		FFT_NOTIFICATIONS_ENABLED: boolString.optional().default(false),
		FFT_EMAIL_FROM: z.string().min(1).optional(),
		FFT_ERP_SYNC_ENABLED: boolString.optional().default(false),
		FFT_ERP_VENDOR: z.string().min(1).optional(),
		FFT_ERP_BASE_URL: z.url().optional(),
		FFT_ERP_API_KEY: z.string().min(1).optional(),
		RESEND_API_KEY: z.string().min(1).optional(),

		PLAYGROUND_ENABLED: boolString.optional().default(false),
		PLAYGROUND_SURVEY_ID: z.string().min(1).optional(),
		PLAYGROUND_ASSIGNMENT_ID: z.string().min(1).optional(),
		PLAYGROUND_SURVEY_SLUG: z.string().min(1).optional(),
		PLAYGROUND_FFT_EVENT_ID: z.string().min(1).optional(),
		PLAYGROUND_FFT_LOCALE: z.string().min(1).optional(),

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

		FFT_RBAC_ENABLED: process.env.FFT_RBAC_ENABLED,
		FFT_DEPOSIT_ENABLED: process.env.FFT_DEPOSIT_ENABLED,
		FFT_PICKUP_OPS_ENABLED: process.env.FFT_PICKUP_OPS_ENABLED,
		FFT_NOTIFICATIONS_ENABLED: process.env.FFT_NOTIFICATIONS_ENABLED,
		FFT_EMAIL_FROM: process.env.FFT_EMAIL_FROM,
		FFT_ERP_SYNC_ENABLED: process.env.FFT_ERP_SYNC_ENABLED,
		FFT_ERP_VENDOR: process.env.FFT_ERP_VENDOR,
		FFT_ERP_BASE_URL: process.env.FFT_ERP_BASE_URL,
		FFT_ERP_API_KEY: process.env.FFT_ERP_API_KEY,
		RESEND_API_KEY: process.env.RESEND_API_KEY,

		PLAYGROUND_ENABLED: process.env.PLAYGROUND_ENABLED,
		PLAYGROUND_SURVEY_ID: process.env.PLAYGROUND_SURVEY_ID,
		PLAYGROUND_ASSIGNMENT_ID: process.env.PLAYGROUND_ASSIGNMENT_ID,
		PLAYGROUND_SURVEY_SLUG: process.env.PLAYGROUND_SURVEY_SLUG,
		PLAYGROUND_FFT_EVENT_ID: process.env.PLAYGROUND_FFT_EVENT_ID,
		PLAYGROUND_FFT_LOCALE: process.env.PLAYGROUND_FFT_LOCALE,

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
});
