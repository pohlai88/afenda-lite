/**
 * @afenda/env
 * Contract: ENV-PRODUCT-REGISTRY
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { z } from "zod";

import {
	approvedNeonBranchIdSchema,
	approvedNeonOrgIdSchema,
	approvedNeonProjectIdSchema,
	assertPlaygroundLocalOnly,
	formatNeonContractIssues,
	type NEON_ENV_CLASSIFICATION,
	type NeonRuntimeContext,
	neonAuthBaseUrlSchema,
	neonAuthCookieSecretSchema,
	productAppUrlSchema,
	productDatabaseUrlSchema,
} from "./neon-contract";

const AI_MODEL_PATTERN = /^[^/\s]+\/[^/\s]+$/;

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

/**
 * Canonical product-variable registry.
 *
 * T3/Zod validation and runtime lookup both derive from this dictionary. The
 * `satisfies` boundary also keeps the schema keys exhaustive with the governed
 * classification ledger.
 */
export function createProductEnvRegistry(runtimeCtx: NeonRuntimeContext) {
	return Object.freeze({
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
		HR_RELIABILITY_TIME_BUDGET_MS: boundedIntString(1000, 55_000, 45_000),
		PAYROLL_OUTBOX_DRAIN_ENABLED: boolString.optional().default(false),
		PAYROLL_OUTBOX_DRAIN_ORG_BATCH_SIZE: boundedIntString(1, 100, 25),
		PAYROLL_OUTBOX_DRAIN_PER_ORG_LIMIT: boundedIntString(1, 200, 25),
		PAYROLL_OUTBOX_DRAIN_TIME_BUDGET_MS: boundedIntString(1000, 55_000, 45_000),
		PAYROLL_JOBS_DRAIN_ENABLED: boolString.optional().default(false),
		PAYROLL_JOBS_DRAIN_BATCH_SIZE: boundedIntString(1, 50, 5),
		PAYROLL_JOBS_DRAIN_LEASE_SECONDS: boundedIntString(60, 900, 180),
		PAYROLL_JOBS_DRAIN_TIME_BUDGET_MS: boundedIntString(1000, 55_000, 45_000),

		AI_GATEWAY_API_KEY: nonEmptyOptionalString,
		AI_THE_MACHINE_MODEL: z
			.string()
			.trim()
			.regex(
				AI_MODEL_PATTERN,
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
	} satisfies Record<keyof typeof NEON_ENV_CLASSIFICATION, z.ZodType>);
}
