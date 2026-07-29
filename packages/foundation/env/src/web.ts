/**
 * @afenda/env
 * Contract: ENV-WEB
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import {
	approvedNeonBranchIdSchema,
	approvedNeonOrgIdSchema,
	approvedNeonProjectIdSchema,
	assertLocalOnlyConfigAbsentInProduction,
	assertPairedSecretConfig,
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

const boundedIntString = (
	minimum: number,
	maximum: number,
	defaultValue: number,
) =>
	z.coerce
		.number()
		.int()
		.min(minimum)
		.max(maximum)
		.optional()
		.default(defaultValue);

const nonEmptyOptionalString = z.string().trim().min(1).optional();

const runtimeCtx = {
	nodeEnv: process.env.NODE_ENV,
	vercelEnv: process.env.VERCEL_ENV,
} as const;

const productionDeployment = isProductionDeployment(runtimeCtx);

const skipValidation =
	!productionDeployment &&
	(process.env.SKIP_ENV_VALIDATION === "true" ||
		process.env.npm_lifecycle_event === "typecheck");

/** True for Vercel development, preview, and production runtimes. */
export function isVercelRuntimeNow(): boolean {
	return isVercelRuntime(runtimeCtx);
}

/** True when the current process is a production deployment. */
export function isProductionDeploymentNow(): boolean {
	return productionDeployment;
}

/** True for local development runtime only; Vercel development remains remote. */
export function isDevelopmentRuntimeNow(): boolean {
	return runtimeCtx.nodeEnv === "development" && !isVercelRuntime(runtimeCtx);
}

/**
 * Typed Next.js environment contract for `@afenda/web`.
 *
 * Product code: `import { env } from "@afenda/env"` — never raw
 * `process.env` for app configuration.
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
		NEON_API_KEY: nonEmptyOptionalString,

		PORTAL_ORG_SLUG: nonEmptyOptionalString,
		PORTAL_ORG_NAME: nonEmptyOptionalString,
		PORTAL_ORG_SWITCHER_ENABLED: boolString.optional().default(false),
		PORTAL_ORGANIZATION_ID: nonEmptyOptionalString,
		E2E_ORGANIZATION_ID: nonEmptyOptionalString,

		GUARDIAN_AUTH_SHELL: boolString.optional().default(true),

		RESEND_API_KEY: nonEmptyOptionalString,

		UPSTASH_REDIS_REST_URL: z.url().optional(),
		UPSTASH_REDIS_REST_TOKEN: nonEmptyOptionalString,

		METRICS_SCRAPE_TOKEN: z.string().min(16).optional(),

		CRON_SECRET: z.string().min(32).optional(),
		HR_RELIABILITY_ENABLED: boolString.optional().default(false),
		HR_RELIABILITY_BATCH_SIZE: boundedIntString(1, 100, 25),
		HR_RELIABILITY_CONCURRENCY: boundedIntString(1, 10, 4),
		HR_RELIABILITY_PER_ORG_LIMIT: boundedIntString(1, 25, 5),
		HR_RELIABILITY_LEASE_SECONDS: boundedIntString(60, 900, 120),
		HR_RELIABILITY_TIME_BUDGET_MS: boundedIntString(1_000, 55_000, 45_000),

		AI_GATEWAY_API_KEY: nonEmptyOptionalString,
		AI_THE_MACHINE_MODEL: z
			.string()
			.trim()
			.regex(
				/^[^/\s]+\/[^/\s]+$/,
				"AI_THE_MACHINE_MODEL must use provider/model format.",
			)
			.optional(),

		HR_ATTENDANCE_CONNECTOR_BASE_URL: z.url().optional(),

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
		PLAYGROUND_SURVEY_ID: nonEmptyOptionalString,
		PLAYGROUND_ASSIGNMENT_ID: nonEmptyOptionalString,
		PLAYGROUND_SURVEY_SLUG: nonEmptyOptionalString,

		SHARED_ADMIN_EMAIL: z.email().optional(),
		SHARED_ADMIN_NAME: nonEmptyOptionalString,
		SHARED_ADMIN_PASSWORD: nonEmptyOptionalString,
		PREVIEW_CLIENT_EMAIL: z.email().optional(),
		PREVIEW_CLIENT_NAME: nonEmptyOptionalString,
		PREVIEW_CLIENT_PASSWORD: nonEmptyOptionalString,
		CLIENT_DEFAULT_PASSWORD: nonEmptyOptionalString,
		E2E_FACTORY_PASSWORD: nonEmptyOptionalString,
		E2E_FACTORY_HASH_TEMPLATE_EMAIL: z.email().optional(),
		E2E_OPERATOR_EMAIL: z.email().optional(),
		E2E_OPERATOR_PASSWORD: nonEmptyOptionalString,
		E2E_CLIENT_EMAIL: z.email().optional(),
		E2E_CLIENT_PASSWORD: nonEmptyOptionalString,
		E2E_INVITEE_EMAIL: z.email().optional(),
		E2E_INVITEE_PASSWORD: nonEmptyOptionalString,
		E2E_SURVEY_SLUG: nonEmptyOptionalString,
		E2E_INVITE_TOKEN: nonEmptyOptionalString,

		SHADCN_STUDIO_EMAIL: z.email().optional(),
		SHADCN_STUDIO_API_KEY: nonEmptyOptionalString,
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

		CRON_SECRET: process.env.CRON_SECRET,
		HR_RELIABILITY_ENABLED: process.env.HR_RELIABILITY_ENABLED,
		HR_RELIABILITY_BATCH_SIZE: process.env.HR_RELIABILITY_BATCH_SIZE,
		HR_RELIABILITY_CONCURRENCY: process.env.HR_RELIABILITY_CONCURRENCY,
		HR_RELIABILITY_PER_ORG_LIMIT: process.env.HR_RELIABILITY_PER_ORG_LIMIT,
		HR_RELIABILITY_LEASE_SECONDS: process.env.HR_RELIABILITY_LEASE_SECONDS,
		HR_RELIABILITY_TIME_BUDGET_MS: process.env.HR_RELIABILITY_TIME_BUDGET_MS,

		AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
		AI_THE_MACHINE_MODEL: process.env.AI_THE_MACHINE_MODEL,

		HR_ATTENDANCE_CONNECTOR_BASE_URL:
			process.env.HR_ATTENDANCE_CONNECTOR_BASE_URL,

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
		E2E_FACTORY_PASSWORD: process.env.E2E_FACTORY_PASSWORD,
		E2E_FACTORY_HASH_TEMPLATE_EMAIL:
			process.env.E2E_FACTORY_HASH_TEMPLATE_EMAIL,
		E2E_OPERATOR_EMAIL: process.env.E2E_OPERATOR_EMAIL,
		E2E_OPERATOR_PASSWORD: process.env.E2E_OPERATOR_PASSWORD,
		E2E_CLIENT_EMAIL: process.env.E2E_CLIENT_EMAIL,
		E2E_CLIENT_PASSWORD: process.env.E2E_CLIENT_PASSWORD,
		E2E_INVITEE_EMAIL: process.env.E2E_INVITEE_EMAIL,
		E2E_INVITEE_PASSWORD: process.env.E2E_INVITEE_PASSWORD,
		E2E_SURVEY_SLUG: process.env.E2E_SURVEY_SLUG,
		E2E_INVITE_TOKEN: process.env.E2E_INVITE_TOKEN,

		SHADCN_STUDIO_EMAIL: process.env.SHADCN_STUDIO_EMAIL,
		SHADCN_STUDIO_API_KEY: process.env.SHADCN_STUDIO_API_KEY,
	},
	emptyStringAsUndefined: true,
	skipValidation,
	createFinalSchema: (shape) =>
		z.object(shape).superRefine((value, ctx) => {
			if (
				value.HR_RELIABILITY_PER_ORG_LIMIT > value.HR_RELIABILITY_BATCH_SIZE
			) {
				ctx.addIssue({
					code: "custom",
					path: ["HR_RELIABILITY_PER_ORG_LIMIT"],
					message:
						"HR reliability per-organization limit cannot exceed batch size.",
				});
			}
			if (value.HR_RELIABILITY_CONCURRENCY > value.HR_RELIABILITY_BATCH_SIZE) {
				ctx.addIssue({
					code: "custom",
					path: ["HR_RELIABILITY_CONCURRENCY"],
					message: "HR reliability concurrency cannot exceed batch size.",
				});
			}

			const upstashResult = assertPairedSecretConfig({
				leftName: "UPSTASH_REDIS_REST_URL",
				leftValue: value.UPSTASH_REDIS_REST_URL,
				rightName: "UPSTASH_REDIS_REST_TOKEN",
				rightValue: value.UPSTASH_REDIS_REST_TOKEN,
			});
			if (!upstashResult.ok) {
				ctx.addIssue({
					code: "custom",
					path: [
						value.UPSTASH_REDIS_REST_URL === undefined
							? "UPSTASH_REDIS_REST_URL"
							: "UPSTASH_REDIS_REST_TOKEN",
					],
					message: formatNeonContractIssues(upstashResult.issues),
				});
			}

			const portalIdentityPresent = value.PORTAL_ORGANIZATION_ID !== undefined;
			const portalDescriptionPresent =
				value.PORTAL_ORG_SLUG !== undefined ||
				value.PORTAL_ORG_NAME !== undefined;
			if (value.PORTAL_ORG_SWITCHER_ENABLED && !portalIdentityPresent) {
				ctx.addIssue({
					code: "custom",
					path: ["PORTAL_ORGANIZATION_ID"],
					message:
						"PORTAL_ORGANIZATION_ID is required when PORTAL_ORG_SWITCHER_ENABLED=true.",
				});
			}
			if (portalDescriptionPresent && !portalIdentityPresent) {
				ctx.addIssue({
					code: "custom",
					path: ["PORTAL_ORGANIZATION_ID"],
					message:
						"PORTAL_ORGANIZATION_ID is required when portal organization metadata is configured.",
				});
			}

			if (
				value.PLAYGROUND_ENABLED &&
				value.PLAYGROUND_SURVEY_ID === undefined &&
				value.PLAYGROUND_ASSIGNMENT_ID === undefined &&
				value.PLAYGROUND_SURVEY_SLUG === undefined
			) {
				ctx.addIssue({
					code: "custom",
					path: ["PLAYGROUND_ENABLED"],
					message:
						"At least one playground survey or assignment target is required when PLAYGROUND_ENABLED=true.",
				});
			}

			const pairedConfigs = [
				{
					result: assertPairedSecretConfig({
						leftName: "PREVIEW_CLIENT_EMAIL",
						leftValue: value.PREVIEW_CLIENT_EMAIL,
						rightName: "PREVIEW_CLIENT_PASSWORD",
						rightValue: value.PREVIEW_CLIENT_PASSWORD,
					}),
					path: "PREVIEW_CLIENT_EMAIL",
				},
				{
					result: assertPairedSecretConfig({
						leftName: "E2E_OPERATOR_EMAIL",
						leftValue: value.E2E_OPERATOR_EMAIL,
						rightName: "E2E_OPERATOR_PASSWORD",
						rightValue: value.E2E_OPERATOR_PASSWORD,
					}),
					path: "E2E_OPERATOR_EMAIL",
				},
				{
					result: assertPairedSecretConfig({
						leftName: "E2E_CLIENT_EMAIL",
						leftValue: value.E2E_CLIENT_EMAIL,
						rightName: "E2E_CLIENT_PASSWORD",
						rightValue: value.E2E_CLIENT_PASSWORD,
					}),
					path: "E2E_CLIENT_EMAIL",
				},
				{
					result: assertPairedSecretConfig({
						leftName: "E2E_INVITEE_EMAIL",
						leftValue: value.E2E_INVITEE_EMAIL,
						rightName: "E2E_INVITEE_PASSWORD",
						rightValue: value.E2E_INVITEE_PASSWORD,
					}),
					path: "E2E_INVITEE_EMAIL",
				},
				{
					result: assertPairedSecretConfig({
						leftName: "SHADCN_STUDIO_EMAIL",
						leftValue: value.SHADCN_STUDIO_EMAIL,
						rightName: "SHADCN_STUDIO_API_KEY",
						rightValue: value.SHADCN_STUDIO_API_KEY,
					}),
					path: "SHADCN_STUDIO_EMAIL",
				},
			] as const;
			for (const config of pairedConfigs) {
				if (!config.result.ok) {
					ctx.addIssue({
						code: "custom",
						path: [config.path],
						message: formatNeonContractIssues(config.result.issues),
					});
				}
			}

			if (!productionDeployment) {
				return;
			}

			if (value.NEON_ORG_ID === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["NEON_ORG_ID"],
					message: "NEON_ORG_ID is required on production deployments.",
				});
			}
			if (value.NEON_PROJECT_ID === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["NEON_PROJECT_ID"],
					message: "NEON_PROJECT_ID is required on production deployments.",
				});
			}
			if (value.NEON_BRANCH_ID === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["NEON_BRANCH_ID"],
					message: "NEON_BRANCH_ID is required on production deployments.",
				});
			}
			if (upstashResult.ok && value.UPSTASH_REDIS_REST_URL === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["UPSTASH_REDIS_REST_URL"],
					message:
						"UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required on production deployments.",
				});
			}
			if (value.HR_RELIABILITY_ENABLED && value.CRON_SECRET === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["CRON_SECRET"],
					message:
						"CRON_SECRET is required in production when HR_RELIABILITY_ENABLED=true.",
				});
			}

			const localOnlyResult = assertLocalOnlyConfigAbsentInProduction(
				{
					NEON_API_KEY: value.NEON_API_KEY,
					PLAYGROUND_ENABLED: value.PLAYGROUND_ENABLED,
					PLAYGROUND_SURVEY_ID: value.PLAYGROUND_SURVEY_ID,
					PLAYGROUND_ASSIGNMENT_ID: value.PLAYGROUND_ASSIGNMENT_ID,
					PLAYGROUND_SURVEY_SLUG: value.PLAYGROUND_SURVEY_SLUG,
					SHARED_ADMIN_EMAIL: value.SHARED_ADMIN_EMAIL,
					SHARED_ADMIN_NAME: value.SHARED_ADMIN_NAME,
					SHARED_ADMIN_PASSWORD: value.SHARED_ADMIN_PASSWORD,
					PREVIEW_CLIENT_EMAIL: value.PREVIEW_CLIENT_EMAIL,
					PREVIEW_CLIENT_NAME: value.PREVIEW_CLIENT_NAME,
					PREVIEW_CLIENT_PASSWORD: value.PREVIEW_CLIENT_PASSWORD,
					CLIENT_DEFAULT_PASSWORD: value.CLIENT_DEFAULT_PASSWORD,
					E2E_ORGANIZATION_ID: value.E2E_ORGANIZATION_ID,
					E2E_FACTORY_PASSWORD: value.E2E_FACTORY_PASSWORD,
					E2E_FACTORY_HASH_TEMPLATE_EMAIL:
						value.E2E_FACTORY_HASH_TEMPLATE_EMAIL,
					E2E_OPERATOR_EMAIL: value.E2E_OPERATOR_EMAIL,
					E2E_OPERATOR_PASSWORD: value.E2E_OPERATOR_PASSWORD,
					E2E_CLIENT_EMAIL: value.E2E_CLIENT_EMAIL,
					E2E_CLIENT_PASSWORD: value.E2E_CLIENT_PASSWORD,
					E2E_INVITEE_EMAIL: value.E2E_INVITEE_EMAIL,
					E2E_INVITEE_PASSWORD: value.E2E_INVITEE_PASSWORD,
					E2E_SURVEY_SLUG: value.E2E_SURVEY_SLUG,
					E2E_INVITE_TOKEN: value.E2E_INVITE_TOKEN,
					SHADCN_STUDIO_EMAIL: value.SHADCN_STUDIO_EMAIL,
					SHADCN_STUDIO_API_KEY: value.SHADCN_STUDIO_API_KEY,
				},
				runtimeCtx,
			);
			if (!localOnlyResult.ok) {
				for (const issue of localOnlyResult.issues) {
					ctx.addIssue({
						code: "custom",
						path: [issue.variable],
						message: issue.message,
					});
				}
			}
		}),
});
