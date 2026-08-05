/**
 * @afenda/env
 * Contract: ENV-NEON-PRODUCT
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { z } from "zod";

import {
	isProductionDeployment,
	type NeonRuntimeContext,
} from "./deployment-context";
import {
	APPROVED_NEON_BRANCH_ID,
	APPROVED_NEON_ORG_ID,
	APPROVED_NEON_PROJECT_ID,
} from "./neon-identity";

const TRAILING_DOT_PATTERN = /\.$/;

/**
 * Neon / Neon Auth product environment contract (N1).
 * Living authority: ARCH-027 · ARCH-023 · ARCH-026 · AGENTS.md.
 * Scratch discovery is not SSOT.
 */

/** Afenda-Lite Neon Cloud — single production branch policy. */
export {
	APPROVED_NEON_BRANCH_ID,
	APPROVED_NEON_ORG_ID,
	APPROVED_NEON_PROJECT_ID,
} from "./neon-identity";
export const PRODUCTION_APP_ORIGIN = "https://www.nexuscanon.com" as const;
export const PRODUCTION_APP_HOST = new URL(PRODUCTION_APP_ORIGIN).hostname;

/** Legacy Vercel project host — approved only outside production. */
export const LEGACY_VERCEL_APP_HOST = "afenda-lite.vercel.app" as const;

/** Approved APP_URL hostnames outside production. */
export const APPROVED_APP_HOSTS = [
	"localhost",
	"127.0.0.1",
	"::1",
	"[::1]",
	PRODUCTION_APP_HOST,
	LEGACY_VERCEL_APP_HOST,
] as const;

/**
 * Baseline Drizzle migration on the production Neon branch is prohibited.
 * Enforcement belongs to `@afenda/db` through its migration guard.
 */
export const PRODUCTION_BASELINE_MIGRATE_PROHIBITED = true as const;

export type NeonEnvClass =
	| "required-product"
	| "required-production-ops"
	| "server-secret"
	| "public-safe"
	| "optional-ops"
	| "local-only";

/** Classification map for operator documentation and audits. */
export const NEON_ENV_CLASSIFICATION = {
	DATABASE_URL: "required-product",
	NEON_AUTH_BASE_URL: "required-product",
	NEON_AUTH_COOKIE_SECRET: "server-secret",
	APP_URL: "required-product",
	NEON_ORG_ID: "required-production-ops",
	NEON_PROJECT_ID: "required-production-ops",
	NEON_BRANCH_ID: "required-production-ops",
	NEON_API_KEY: "local-only",
	UPSTASH_REDIS_REST_URL: "required-product",
	UPSTASH_REDIS_REST_TOKEN: "server-secret",
	PORTAL_ORG_SLUG: "optional-ops",
	PORTAL_ORG_NAME: "optional-ops",
	PORTAL_ORG_SWITCHER_ENABLED: "optional-ops",
	PORTAL_ORGANIZATION_ID: "optional-ops",
	GUARDIAN_AUTH_SHELL: "optional-ops",
	RESEND_API_KEY: "server-secret",
	METRICS_SCRAPE_TOKEN: "server-secret",
	CRON_SECRET: "server-secret",
	HR_RELIABILITY_ENABLED: "optional-ops",
	HR_RELIABILITY_BATCH_SIZE: "optional-ops",
	HR_RELIABILITY_CONCURRENCY: "optional-ops",
	HR_RELIABILITY_PER_ORG_LIMIT: "optional-ops",
	HR_RELIABILITY_LEASE_SECONDS: "optional-ops",
	HR_RELIABILITY_TIME_BUDGET_MS: "optional-ops",
	PAYROLL_OUTBOX_DRAIN_ENABLED: "optional-ops",
	PAYROLL_OUTBOX_DRAIN_ORG_BATCH_SIZE: "optional-ops",
	PAYROLL_OUTBOX_DRAIN_PER_ORG_LIMIT: "optional-ops",
	PAYROLL_OUTBOX_DRAIN_TIME_BUDGET_MS: "optional-ops",
	PAYROLL_JOBS_DRAIN_ENABLED: "optional-ops",
	PAYROLL_JOBS_DRAIN_BATCH_SIZE: "optional-ops",
	PAYROLL_JOBS_DRAIN_LEASE_SECONDS: "optional-ops",
	PAYROLL_JOBS_DRAIN_TIME_BUDGET_MS: "optional-ops",
	AI_GATEWAY_API_KEY: "server-secret",
	AI_THE_MACHINE_MODEL: "optional-ops",
	HR_ATTENDANCE_CONNECTOR_BASE_URL: "optional-ops",
	PLAYGROUND_ENABLED: "local-only",
	PLAYGROUND_SURVEY_ID: "local-only",
	PLAYGROUND_ASSIGNMENT_ID: "local-only",
	PLAYGROUND_SURVEY_SLUG: "local-only",
	SHARED_ADMIN_EMAIL: "local-only",
	SHARED_ADMIN_NAME: "local-only",
	SHARED_ADMIN_PASSWORD: "local-only",
	PREVIEW_CLIENT_EMAIL: "local-only",
	PREVIEW_CLIENT_NAME: "local-only",
	PREVIEW_CLIENT_PASSWORD: "local-only",
	CLIENT_DEFAULT_PASSWORD: "local-only",
	E2E_ORGANIZATION_ID: "local-only",
	E2E_FACTORY_PASSWORD: "local-only",
	E2E_FACTORY_HASH_TEMPLATE_EMAIL: "local-only",
	E2E_OPERATOR_EMAIL: "local-only",
	E2E_OPERATOR_PASSWORD: "local-only",
	E2E_CLIENT_EMAIL: "local-only",
	E2E_CLIENT_PASSWORD: "local-only",
	E2E_INVITEE_EMAIL: "local-only",
	E2E_INVITEE_PASSWORD: "local-only",
	E2E_SURVEY_SLUG: "local-only",
	E2E_INVITE_TOKEN: "local-only",
	SHADCN_STUDIO_EMAIL: "local-only",
	SHADCN_STUDIO_API_KEY: "local-only",
} as const satisfies Record<string, NeonEnvClass>;

export type NeonContractIssue = Readonly<{
	variable: string;
	message: string;
}>;

export type NeonContractResult = Readonly<{
	ok: boolean;
	issues: readonly NeonContractIssue[];
}>;

/**
 * Deployment classification is owned by `deployment-context.ts` and shared with
 * the docs registry. Re-exported here so existing product consumers keep their
 * import site.
 */
export {
	classifyDeployment,
	type DeploymentClass,
	isProductionDeployment,
	isVercelRuntime,
	type NeonRuntimeContext,
} from "./deployment-context";

export function redactEnvValue(_value: string | undefined): string {
	return "[redacted]";
}

function normalizeHostname(hostname: string): string {
	return hostname.trim().toLowerCase().replace(TRAILING_DOT_PATTERN, "");
}

function isLocalHostname(hostname: string): boolean {
	const normalized = normalizeHostname(hostname);
	return (
		normalized === "localhost" ||
		normalized === "127.0.0.1" ||
		normalized === "::1" ||
		normalized === "[::1]"
	);
}

function isPoolerHostname(hostname: string): boolean {
	return normalizeHostname(hostname)
		.split(".")
		.some((label) => label.endsWith("-pooler"));
}

export function isNeonPoolerDatabaseUrl(databaseUrl: string): boolean {
	try {
		const parsed = new URL(databaseUrl);
		return (
			(parsed.protocol === "postgresql:" || parsed.protocol === "postgres:") &&
			isPoolerHostname(parsed.hostname)
		);
	} catch {
		return false;
	}
}

export function assertProductDatabaseUrl(
	databaseUrl: string,
): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	try {
		const parsed = new URL(databaseUrl);
		if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
			issues.push({
				variable: "DATABASE_URL",
				message: "must use the postgres: or postgresql: protocol",
			});
		}
		if (!isPoolerHostname(parsed.hostname)) {
			issues.push({
				variable: "DATABASE_URL",
				message:
					"must use a Neon pooled endpoint for product runtime; migration tooling must use its separately governed direct endpoint",
			});
		}
	} catch {
		issues.push({
			variable: "DATABASE_URL",
			message: "must be a valid PostgreSQL URL",
		});
	}
	return { ok: issues.length === 0, issues };
}

export function isApprovedAppHost(hostname: string): boolean {
	const normalized = normalizeHostname(hostname);
	return (APPROVED_APP_HOSTS as readonly string[]).some(
		(host) => normalizeHostname(host) === normalized,
	);
}

export function assertAppUrl(
	appUrl: string,
	ctx: NeonRuntimeContext = {},
): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	try {
		const parsed = new URL(appUrl);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			issues.push({
				variable: "APP_URL",
				message: "must use the http: or https: protocol",
			});
		}
		if (
			!(isProductionDeployment(ctx) || isLocalHostname(parsed.hostname)) &&
			parsed.protocol !== "https:"
		) {
			issues.push({
				variable: "APP_URL",
				message: "must use https: for non-local application hosts",
			});
		}
		if (parsed.username || parsed.password) {
			issues.push({
				variable: "APP_URL",
				message: "must not contain embedded credentials",
			});
		}
		if (parsed.pathname !== "/" && parsed.pathname !== "") {
			issues.push({
				variable: "APP_URL",
				message: "must be an application origin without a path",
			});
		}
		if (parsed.search || parsed.hash) {
			issues.push({
				variable: "APP_URL",
				message: "must not contain query parameters or a fragment",
			});
		}
		if (isProductionDeployment(ctx)) {
			if (parsed.protocol !== "https:") {
				issues.push({
					variable: "APP_URL",
					message: "must use https: in production",
				});
			}
			if (parsed.origin !== PRODUCTION_APP_ORIGIN) {
				issues.push({
					variable: "APP_URL",
					message: `must equal approved production origin ${PRODUCTION_APP_ORIGIN}`,
				});
			}
		} else if (!isApprovedAppHost(parsed.hostname)) {
			issues.push({
				variable: "APP_URL",
				message:
					"hostname must be one of the approved development, preview, or production hosts: " +
					APPROVED_APP_HOSTS.join(", "),
			});
		}
	} catch {
		issues.push({
			variable: "APP_URL",
			message: "must be a valid URL",
		});
	}
	return { ok: issues.length === 0, issues };
}

export function assertNeonAuthBaseUrl(baseUrl: string): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	try {
		const parsed = new URL(baseUrl);
		if (parsed.protocol !== "https:") {
			issues.push({
				variable: "NEON_AUTH_BASE_URL",
				message: "must use https:",
			});
		}
		if (parsed.username || parsed.password) {
			issues.push({
				variable: "NEON_AUTH_BASE_URL",
				message: "must not contain embedded credentials",
			});
		}
		if (parsed.search || parsed.hash) {
			issues.push({
				variable: "NEON_AUTH_BASE_URL",
				message: "must not contain query parameters or a fragment",
			});
		}
	} catch {
		issues.push({
			variable: "NEON_AUTH_BASE_URL",
			message: "must be a valid HTTPS URL",
		});
	}
	return { ok: issues.length === 0, issues };
}

export function assertCookieSecret(secret: string): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	if (secret.length < 32) {
		issues.push({
			variable: "NEON_AUTH_COOKIE_SECRET",
			message: "must be at least 32 characters",
		});
	}
	if (secret.trim() !== secret) {
		issues.push({
			variable: "NEON_AUTH_COOKIE_SECRET",
			message: "must not contain leading or trailing whitespace",
		});
	}
	return { ok: issues.length === 0, issues };
}

export function assertPairedSecretConfig(
	input: Readonly<{
		leftName: string;
		leftValue?: string | undefined;
		rightName: string;
		rightValue?: string | undefined;
	}>,
): NeonContractResult {
	const leftPresent = input.leftValue !== undefined;
	const rightPresent = input.rightValue !== undefined;
	if (leftPresent === rightPresent) {
		return { ok: true, issues: [] };
	}

	return {
		ok: false,
		issues: [
			{
				variable: `${input.leftName}/${input.rightName}`,
				message: "must be configured together or both left unset",
			},
		],
	};
}

export function assertNeonCloudIds(input: {
	orgId?: string | undefined;
	projectId?: string | undefined;
	branchId?: string | undefined;
	requireAll?: boolean;
}): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	const requireAll = input.requireAll === true;
	if (requireAll && input.orgId === undefined) {
		issues.push({
			variable: "NEON_ORG_ID",
			message: "is required for production environment verification",
		});
	}
	if (requireAll && input.projectId === undefined) {
		issues.push({
			variable: "NEON_PROJECT_ID",
			message: "is required for production environment verification",
		});
	}
	if (requireAll && input.branchId === undefined) {
		issues.push({
			variable: "NEON_BRANCH_ID",
			message: "is required for production environment verification",
		});
	}
	if (input.orgId !== undefined && input.orgId !== APPROVED_NEON_ORG_ID) {
		issues.push({
			variable: "NEON_ORG_ID",
			message: `must equal approved organization ${APPROVED_NEON_ORG_ID}`,
		});
	}
	if (
		input.projectId !== undefined &&
		input.projectId !== APPROVED_NEON_PROJECT_ID
	) {
		issues.push({
			variable: "NEON_PROJECT_ID",
			message: `must equal approved project ${APPROVED_NEON_PROJECT_ID}`,
		});
	}
	if (
		input.branchId !== undefined &&
		input.branchId !== APPROVED_NEON_BRANCH_ID
	) {
		issues.push({
			variable: "NEON_BRANCH_ID",
			message: `must equal approved production branch ${APPROVED_NEON_BRANCH_ID}`,
		});
	}
	return { ok: issues.length === 0, issues };
}

type ProductEnvKey = keyof typeof NEON_ENV_CLASSIFICATION;
export type LocalOnlyProductEnvKey = {
	[K in ProductEnvKey]: (typeof NEON_ENV_CLASSIFICATION)[K] extends "local-only"
		? K
		: never;
}[ProductEnvKey];

function productEnvKeys(): readonly ProductEnvKey[] {
	return Object.keys(NEON_ENV_CLASSIFICATION) as ProductEnvKey[];
}

function isLocalOnlyProductEnvKey(
	key: ProductEnvKey,
): key is LocalOnlyProductEnvKey {
	return NEON_ENV_CLASSIFICATION[key] === "local-only";
}

export const LOCAL_ONLY_PRODUCT_ENV_KEYS = Object.freeze(
	productEnvKeys().filter(isLocalOnlyProductEnvKey),
);

export function assertLocalOnlyConfigAbsentInProduction(
	values: Partial<Record<LocalOnlyProductEnvKey, unknown>>,
	ctx: NeonRuntimeContext = {},
): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	if (!isProductionDeployment(ctx)) {
		return { ok: true, issues };
	}
	for (const key of LOCAL_ONLY_PRODUCT_ENV_KEYS) {
		const value = values[key];
		const present =
			value !== undefined && value !== null && value !== false && value !== "";
		if (present) {
			issues.push({
				variable: key,
				message:
					"must be unset in production because it is restricted to local development, E2E, or operator tooling",
			});
		}
	}
	return { ok: issues.length === 0, issues };
}

export function assertPlaygroundLocalOnly(
	playgroundEnabled: boolean | undefined,
	ctx: NeonRuntimeContext = {},
): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	if (isProductionDeployment(ctx) && playgroundEnabled === true) {
		issues.push({
			variable: "PLAYGROUND_ENABLED",
			message: "must not be enabled in production",
		});
	}
	return { ok: issues.length === 0, issues };
}

export type ProdBranchMigratePostureResult = NeonContractResult &
	Readonly<{
		baselineMigrateAllowed: boolean;
		detail: string;
	}>;

/**
 * Identify the production-branch baseline migration prohibition.
 *
 * A missing branch ID is not accepted as evidence that the migration target
 * is safe.
 */
export function evaluateProdBranchBaselineMigratePosture(
	input: Readonly<{
		branchId?: string;
	}>,
): ProdBranchMigratePostureResult {
	if (input.branchId === undefined) {
		const issues: NeonContractIssue[] = [
			{
				variable: "NEON_BRANCH_ID",
				message:
					"is required before production branch migration posture can be evaluated",
			},
		];
		return {
			ok: false,
			baselineMigrateAllowed: false,
			issues,
			detail: formatNeonContractIssues(issues),
		};
	}

	const cloud = assertNeonCloudIds({ branchId: input.branchId });
	if (!cloud.ok) {
		return {
			ok: false,
			baselineMigrateAllowed: false,
			issues: cloud.issues,
			detail: formatNeonContractIssues(cloud.issues),
		};
	}

	return {
		ok: true,
		baselineMigrateAllowed: false,
		issues: [],
		detail:
			"production branch identity confirmed; baseline migration " +
			`is prohibited on ${APPROVED_NEON_BRANCH_ID}`,
	};
}

export type NeonProductEnvInput = Readonly<{
	DATABASE_URL?: string;
	NEON_AUTH_BASE_URL?: string;
	NEON_AUTH_COOKIE_SECRET?: string;
	APP_URL?: string;
	NEON_ORG_ID?: string;
	NEON_PROJECT_ID?: string;
	NEON_BRANCH_ID?: string;
	NEON_API_KEY?: string;
	PLAYGROUND_SURVEY_ID?: string;
	PLAYGROUND_ASSIGNMENT_ID?: string;
	PLAYGROUND_SURVEY_SLUG?: string;
	SHARED_ADMIN_EMAIL?: string;
	SHARED_ADMIN_NAME?: string;
	SHARED_ADMIN_PASSWORD?: string;
	PREVIEW_CLIENT_EMAIL?: string;
	PREVIEW_CLIENT_NAME?: string;
	PREVIEW_CLIENT_PASSWORD?: string;
	CLIENT_DEFAULT_PASSWORD?: string;
	E2E_ORGANIZATION_ID?: string;
	E2E_FACTORY_PASSWORD?: string;
	E2E_FACTORY_HASH_TEMPLATE_EMAIL?: string;
	E2E_OPERATOR_EMAIL?: string;
	E2E_OPERATOR_PASSWORD?: string;
	E2E_CLIENT_EMAIL?: string;
	E2E_CLIENT_PASSWORD?: string;
	E2E_INVITEE_EMAIL?: string;
	E2E_INVITEE_PASSWORD?: string;
	E2E_SURVEY_SLUG?: string;
	E2E_INVITE_TOKEN?: string;
	SHADCN_STUDIO_EMAIL?: string;
	SHADCN_STUDIO_API_KEY?: string;
	PLAYGROUND_ENABLED?: boolean;
	UPSTASH_REDIS_REST_URL?: string;
	UPSTASH_REDIS_REST_TOKEN?: string;
}>;

/** Full product Neon contract — issues never include secret values. */
export function evaluateNeonProductEnv(
	input: NeonProductEnvInput,
	ctx: NeonRuntimeContext = {},
): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	const production = isProductionDeployment(ctx);

	if (input.DATABASE_URL === undefined) {
		issues.push({ variable: "DATABASE_URL", message: "is required" });
	} else {
		issues.push(...assertProductDatabaseUrl(input.DATABASE_URL).issues);
	}

	if (input.NEON_AUTH_BASE_URL === undefined) {
		issues.push({ variable: "NEON_AUTH_BASE_URL", message: "is required" });
	} else {
		issues.push(...assertNeonAuthBaseUrl(input.NEON_AUTH_BASE_URL).issues);
	}

	if (input.NEON_AUTH_COOKIE_SECRET === undefined) {
		issues.push({
			variable: "NEON_AUTH_COOKIE_SECRET",
			message: "is required",
		});
	} else {
		issues.push(...assertCookieSecret(input.NEON_AUTH_COOKIE_SECRET).issues);
	}

	if (input.APP_URL === undefined) {
		issues.push({ variable: "APP_URL", message: "is required" });
	} else {
		issues.push(...assertAppUrl(input.APP_URL, ctx).issues);
	}

	issues.push(
		...assertNeonCloudIds({
			orgId: input.NEON_ORG_ID,
			projectId: input.NEON_PROJECT_ID,
			branchId: input.NEON_BRANCH_ID,
			requireAll: production,
		}).issues,
	);

	issues.push(
		...assertLocalOnlyConfigAbsentInProduction(
			{
				NEON_API_KEY: input.NEON_API_KEY,
				PLAYGROUND_ENABLED: input.PLAYGROUND_ENABLED,
				PLAYGROUND_SURVEY_ID: input.PLAYGROUND_SURVEY_ID,
				PLAYGROUND_ASSIGNMENT_ID: input.PLAYGROUND_ASSIGNMENT_ID,
				PLAYGROUND_SURVEY_SLUG: input.PLAYGROUND_SURVEY_SLUG,
				SHARED_ADMIN_EMAIL: input.SHARED_ADMIN_EMAIL,
				SHARED_ADMIN_NAME: input.SHARED_ADMIN_NAME,
				SHARED_ADMIN_PASSWORD: input.SHARED_ADMIN_PASSWORD,
				PREVIEW_CLIENT_EMAIL: input.PREVIEW_CLIENT_EMAIL,
				PREVIEW_CLIENT_NAME: input.PREVIEW_CLIENT_NAME,
				PREVIEW_CLIENT_PASSWORD: input.PREVIEW_CLIENT_PASSWORD,
				CLIENT_DEFAULT_PASSWORD: input.CLIENT_DEFAULT_PASSWORD,
				E2E_ORGANIZATION_ID: input.E2E_ORGANIZATION_ID,
				E2E_FACTORY_PASSWORD: input.E2E_FACTORY_PASSWORD,
				E2E_FACTORY_HASH_TEMPLATE_EMAIL: input.E2E_FACTORY_HASH_TEMPLATE_EMAIL,
				E2E_OPERATOR_EMAIL: input.E2E_OPERATOR_EMAIL,
				E2E_OPERATOR_PASSWORD: input.E2E_OPERATOR_PASSWORD,
				E2E_CLIENT_EMAIL: input.E2E_CLIENT_EMAIL,
				E2E_CLIENT_PASSWORD: input.E2E_CLIENT_PASSWORD,
				E2E_INVITEE_EMAIL: input.E2E_INVITEE_EMAIL,
				E2E_INVITEE_PASSWORD: input.E2E_INVITEE_PASSWORD,
				E2E_SURVEY_SLUG: input.E2E_SURVEY_SLUG,
				E2E_INVITE_TOKEN: input.E2E_INVITE_TOKEN,
				SHADCN_STUDIO_EMAIL: input.SHADCN_STUDIO_EMAIL,
				SHADCN_STUDIO_API_KEY: input.SHADCN_STUDIO_API_KEY,
			},
			ctx,
		).issues,
	);

	issues.push(
		...assertPlaygroundLocalOnly(input.PLAYGROUND_ENABLED, ctx).issues,
	);

	const upstashPair = assertPairedSecretConfig({
		leftName: "UPSTASH_REDIS_REST_URL",
		leftValue: input.UPSTASH_REDIS_REST_URL,
		rightName: "UPSTASH_REDIS_REST_TOKEN",
		rightValue: input.UPSTASH_REDIS_REST_TOKEN,
	});
	if (!upstashPair.ok) {
		issues.push(...upstashPair.issues);
	} else if (production && input.UPSTASH_REDIS_REST_URL === undefined) {
		issues.push({
			variable: "UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN",
			message:
				"are required in production for distributed cache and rate-limit infrastructure",
		});
	}

	return { ok: issues.length === 0, issues };
}

export function formatNeonContractIssues(
	issues: readonly NeonContractIssue[],
): string {
	return issues
		.map((issue) => `${issue.variable}: ${issue.message}`)
		.join("; ");
}

/** Zod schemas shared by `createEnv` (values never logged). */
export const productDatabaseUrlSchema = z
	.url()
	.refine((value) => assertProductDatabaseUrl(value).ok, {
		message:
			"DATABASE_URL must use a PostgreSQL protocol and a Neon pooled endpoint",
	});

export const neonAuthBaseUrlSchema = z
	.url()
	.refine((value) => assertNeonAuthBaseUrl(value).ok, {
		message: "NEON_AUTH_BASE_URL must be a valid HTTPS URL",
	});

export const neonAuthCookieSecretSchema = z
	.string()
	.min(32, "NEON_AUTH_COOKIE_SECRET must be at least 32 characters")
	.refine((value) => value.trim() === value, {
		message: "NEON_AUTH_COOKIE_SECRET must not contain surrounding whitespace",
	});

export function productAppUrlSchema(ctx: NeonRuntimeContext = {}) {
	return z.url().refine((value) => assertAppUrl(value, ctx).ok, {
		message:
			"APP_URL must be an approved application origin; production must use the exact approved HTTPS origin",
	});
}

export const approvedNeonOrgIdSchema = z.literal(APPROVED_NEON_ORG_ID);
export const approvedNeonProjectIdSchema = z.literal(APPROVED_NEON_PROJECT_ID);
export const approvedNeonBranchIdSchema = z.literal(APPROVED_NEON_BRANCH_ID);
