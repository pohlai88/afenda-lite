/**
 * @afenda/env
 * Contract: ENV-WEB
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import {
	assertLocalOnlyConfigAbsentInProduction,
	assertPairedSecretConfig,
	formatNeonContractIssues,
	isProductionDeployment,
	isVercelRuntime,
} from "./neon-contract";
import { createProductEnvRegistry } from "./product-registry";
import { projectRuntimeEnv } from "./runtime-projection";

const runtimeCtx = {
	nodeEnv: process.env.NODE_ENV,
	vercelEnv: process.env.VERCEL_ENV,
} as const;

const productionDeployment = isProductionDeployment(runtimeCtx);
const productEnvRegistry = createProductEnvRegistry(runtimeCtx);

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
		PAYROLL_OUTBOX_DRAIN_ENABLED: boolean;
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
	if (value.PAYROLL_OUTBOX_DRAIN_ENABLED && value.CRON_SECRET === undefined) {
		addCustomIssue(
			ctx,
			"CRON_SECRET",
			"CRON_SECRET is required in production when PAYROLL_OUTBOX_DRAIN_ENABLED=true.",
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
	server: productEnvRegistry,
	client: {},
	runtimeEnv: projectRuntimeEnv(productEnvRegistry, process.env),
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
