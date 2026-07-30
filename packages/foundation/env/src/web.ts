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

type ReliabilityValues = Readonly<{
	HR_RELIABILITY_PER_ORG_LIMIT: number;
	HR_RELIABILITY_BATCH_SIZE: number;
	HR_RELIABILITY_CONCURRENCY: number;
}>;

type UpstashValues = Readonly<{
	UPSTASH_REDIS_REST_URL?: string | undefined;
	UPSTASH_REDIS_REST_TOKEN?: string | undefined;
}>;

type PortalValues = Readonly<{
	PORTAL_ORGANIZATION_ID?: string | undefined;
	PORTAL_ORG_SLUG?: string | undefined;
	PORTAL_ORG_NAME?: string | undefined;
	PORTAL_ORG_SWITCHER_ENABLED: boolean;
}>;

type PlaygroundValues = Readonly<{
	PLAYGROUND_ENABLED: boolean;
	PLAYGROUND_SURVEY_ID?: string | undefined;
	PLAYGROUND_ASSIGNMENT_ID?: string | undefined;
	PLAYGROUND_SURVEY_SLUG?: string | undefined;
}>;

type ProductionValues = Parameters<
	typeof assertLocalOnlyConfigAbsentInProduction
>[0] &
	Readonly<{
		NEON_ORG_ID?: string | undefined;
		NEON_PROJECT_ID?: string | undefined;
		NEON_BRANCH_ID?: string | undefined;
		UPSTASH_REDIS_REST_URL?: string | undefined;
		HR_RELIABILITY_ENABLED: boolean;
		CRON_SECRET?: string | undefined;
	}>;

function addCustomIssue(
	ctx: z.RefinementCtx,
	path: string,
	message: string,
): void {
	ctx.addIssue({ code: "custom", path: [path], message });
}

function validateReliabilityLimits(
	value: ReliabilityValues,
	ctx: z.RefinementCtx,
): void {
	if (value.HR_RELIABILITY_PER_ORG_LIMIT > value.HR_RELIABILITY_BATCH_SIZE) {
		addCustomIssue(
			ctx,
			"HR_RELIABILITY_PER_ORG_LIMIT",
			"HR reliability per-organization limit cannot exceed batch size.",
		);
	}
	if (value.HR_RELIABILITY_CONCURRENCY > value.HR_RELIABILITY_BATCH_SIZE) {
		addCustomIssue(
			ctx,
			"HR_RELIABILITY_CONCURRENCY",
			"HR reliability concurrency cannot exceed batch size.",
		);
	}
}

function validateUpstashPair(
	value: UpstashValues,
	ctx: z.RefinementCtx,
): boolean {
	const result = assertPairedSecretConfig({
		leftName: "UPSTASH_REDIS_REST_URL",
		leftValue: value.UPSTASH_REDIS_REST_URL,
		rightName: "UPSTASH_REDIS_REST_TOKEN",
		rightValue: value.UPSTASH_REDIS_REST_TOKEN,
	});
	if (!result.ok) {
		addCustomIssue(
			ctx,
			value.UPSTASH_REDIS_REST_URL === undefined
				? "UPSTASH_REDIS_REST_URL"
				: "UPSTASH_REDIS_REST_TOKEN",
			formatNeonContractIssues(result.issues),
		);
	}
	return result.ok;
}

function validatePortalIdentity(
	value: PortalValues,
	ctx: z.RefinementCtx,
): void {
	const identityPresent = value.PORTAL_ORGANIZATION_ID !== undefined;
	const descriptionPresent =
		value.PORTAL_ORG_SLUG !== undefined || value.PORTAL_ORG_NAME !== undefined;
	if (value.PORTAL_ORG_SWITCHER_ENABLED && !identityPresent) {
		addCustomIssue(
			ctx,
			"PORTAL_ORGANIZATION_ID",
			"PORTAL_ORGANIZATION_ID is required when PORTAL_ORG_SWITCHER_ENABLED=true.",
		);
	}
	if (descriptionPresent && !identityPresent) {
		addCustomIssue(
			ctx,
			"PORTAL_ORGANIZATION_ID",
			"PORTAL_ORGANIZATION_ID is required when portal organization metadata is configured.",
		);
	}
}

function validatePlaygroundTarget(
	value: PlaygroundValues,
	ctx: z.RefinementCtx,
): void {
	if (
		value.PLAYGROUND_ENABLED &&
		value.PLAYGROUND_SURVEY_ID === undefined &&
		value.PLAYGROUND_ASSIGNMENT_ID === undefined &&
		value.PLAYGROUND_SURVEY_SLUG === undefined
	) {
		addCustomIssue(
			ctx,
			"PLAYGROUND_ENABLED",
			"At least one playground survey or assignment target is required when PLAYGROUND_ENABLED=true.",
		);
	}
}

function validatePairedCredential(
	ctx: z.RefinementCtx,
	leftName: string,
	leftValue: string | undefined,
	rightName: string,
	rightValue: string | undefined,
): void {
	const result = assertPairedSecretConfig({
		leftName,
		leftValue,
		rightName,
		rightValue,
	});
	if (!result.ok) {
		addCustomIssue(ctx, leftName, formatNeonContractIssues(result.issues));
	}
}

function validatePairedCredentials(
	value: Readonly<{
		PREVIEW_CLIENT_EMAIL?: string | undefined;
		PREVIEW_CLIENT_PASSWORD?: string | undefined;
		E2E_OPERATOR_EMAIL?: string | undefined;
		E2E_OPERATOR_PASSWORD?: string | undefined;
		E2E_CLIENT_EMAIL?: string | undefined;
		E2E_CLIENT_PASSWORD?: string | undefined;
		E2E_INVITEE_EMAIL?: string | undefined;
		E2E_INVITEE_PASSWORD?: string | undefined;
		SHADCN_STUDIO_EMAIL?: string | undefined;
		SHADCN_STUDIO_API_KEY?: string | undefined;
	}>,
	ctx: z.RefinementCtx,
): void {
	validatePairedCredential(
		ctx,
		"PREVIEW_CLIENT_EMAIL",
		value.PREVIEW_CLIENT_EMAIL,
		"PREVIEW_CLIENT_PASSWORD",
		value.PREVIEW_CLIENT_PASSWORD,
	);
	validatePairedCredential(
		ctx,
		"E2E_OPERATOR_EMAIL",
		value.E2E_OPERATOR_EMAIL,
		"E2E_OPERATOR_PASSWORD",
		value.E2E_OPERATOR_PASSWORD,
	);
	validatePairedCredential(
		ctx,
		"E2E_CLIENT_EMAIL",
		value.E2E_CLIENT_EMAIL,
		"E2E_CLIENT_PASSWORD",
		value.E2E_CLIENT_PASSWORD,
	);
	validatePairedCredential(
		ctx,
		"E2E_INVITEE_EMAIL",
		value.E2E_INVITEE_EMAIL,
		"E2E_INVITEE_PASSWORD",
		value.E2E_INVITEE_PASSWORD,
	);
	validatePairedCredential(
		ctx,
		"SHADCN_STUDIO_EMAIL",
		value.SHADCN_STUDIO_EMAIL,
		"SHADCN_STUDIO_API_KEY",
		value.SHADCN_STUDIO_API_KEY,
	);
}

function validateProductionRequirements(
	value: ProductionValues,
	ctx: z.RefinementCtx,
	upstashPairValid: boolean,
): void {
	if (!productionDeployment) {
		return;
	}
	if (value.NEON_ORG_ID === undefined) {
		addCustomIssue(
			ctx,
			"NEON_ORG_ID",
			"NEON_ORG_ID is required on production deployments.",
		);
	}
	if (value.NEON_PROJECT_ID === undefined) {
		addCustomIssue(
			ctx,
			"NEON_PROJECT_ID",
			"NEON_PROJECT_ID is required on production deployments.",
		);
	}
	if (value.NEON_BRANCH_ID === undefined) {
		addCustomIssue(
			ctx,
			"NEON_BRANCH_ID",
			"NEON_BRANCH_ID is required on production deployments.",
		);
	}
	if (upstashPairValid && value.UPSTASH_REDIS_REST_URL === undefined) {
		addCustomIssue(
			ctx,
			"UPSTASH_REDIS_REST_URL",
			"UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required on production deployments.",
		);
	}
	if (value.HR_RELIABILITY_ENABLED && value.CRON_SECRET === undefined) {
		addCustomIssue(
			ctx,
			"CRON_SECRET",
			"CRON_SECRET is required in production when HR_RELIABILITY_ENABLED=true.",
		);
	}

	const localOnlyResult = assertLocalOnlyConfigAbsentInProduction(
		value,
		runtimeCtx,
	);
	if (!localOnlyResult.ok) {
		for (const issue of localOnlyResult.issues) {
			addCustomIssue(ctx, issue.variable, issue.message);
		}
	}
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
		HR_RELIABILITY_TIME_BUDGET_MS: boundedIntString(1000, 55_000, 45_000),

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
			validateReliabilityLimits(value, ctx);
			const upstashPairValid = validateUpstashPair(value, ctx);
			validatePortalIdentity(value, ctx);
			validatePlaygroundTarget(value, ctx);
			validatePairedCredentials(value, ctx);
			validateProductionRequirements(value, ctx, upstashPairValid);
		}),
});
