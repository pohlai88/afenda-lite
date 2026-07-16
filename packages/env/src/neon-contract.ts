import { z } from "zod";

/**
 * Neon / Neon Auth product environment contract (N1).
 * Living authority: ARCH-027 · ARCH-023 · ARCH-026 · AGENTS.md.
 * Scratch discovery is not SSOT.
 */

/** Afenda-Lite Neon Cloud — single production branch policy. */
export const APPROVED_NEON_ORG_ID = "org-fragrant-lake-90358173" as const;
export const APPROVED_NEON_PROJECT_ID = "young-hat-54755363" as const;
export const APPROVED_NEON_BRANCH_ID = "br-tiny-hill-ao82jp6f" as const;
export const PRODUCTION_APP_ORIGIN = "https://afenda-lite.vercel.app" as const;

export type NeonEnvClass =
	| "required-product"
	| "server-secret"
	| "public-safe"
	| "optional-ops"
	| "local-only";

/** Classification map for ops docs / audits (no secret values). */
export const NEON_ENV_CLASSIFICATION = {
	DATABASE_URL: "required-product",
	NEON_AUTH_BASE_URL: "required-product",
	NEON_AUTH_COOKIE_SECRET: "server-secret",
	APP_URL: "required-product",
	NEON_ORG_ID: "optional-ops",
	NEON_PROJECT_ID: "optional-ops",
	NEON_BRANCH_ID: "optional-ops",
	NEON_API_KEY: "optional-ops",
	SHARED_ADMIN_PASSWORD: "local-only",
	PREVIEW_CLIENT_PASSWORD: "local-only",
	CLIENT_DEFAULT_PASSWORD: "local-only",
	PLAYGROUND_ENABLED: "local-only",
} as const satisfies Record<string, NeonEnvClass>;

export type NeonContractIssue = {
	variable: string;
	message: string;
};

export type NeonContractResult = {
	ok: boolean;
	issues: NeonContractIssue[];
};

export type NeonRuntimeContext = {
	nodeEnv?: string;
	vercelEnv?: string;
};

/** Vercel production deployment (not merely `next build` locally). */
export function isProductionDeployment(ctx: NeonRuntimeContext = {}): boolean {
	return ctx.vercelEnv === "production";
}

export function redactEnvValue(_value: string | undefined): string {
	return "[redacted]";
}

export function isNeonPoolerDatabaseUrl(databaseUrl: string): boolean {
	try {
		return new URL(databaseUrl).hostname.includes("-pooler");
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
				message: "must be a postgres URL (postgresql: or postgres:)",
			});
		}
		if (!parsed.hostname.includes("-pooler")) {
			issues.push({
				variable: "DATABASE_URL",
				message:
					"must use Neon -pooler host for product runtime (ARCH-023); migrations may use a direct endpoint outside this contract",
			});
		}
	} catch {
		issues.push({
			variable: "DATABASE_URL",
			message: "must be a valid URL",
		});
	}
	return { ok: issues.length === 0, issues };
}

export function assertAppUrl(
	appUrl: string,
	ctx: NeonRuntimeContext = {},
): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	try {
		const parsed = new URL(appUrl);
		if (isProductionDeployment(ctx)) {
			if (parsed.protocol !== "https:") {
				issues.push({
					variable: "APP_URL",
					message:
						"must use https: on Vercel production (VERCEL_ENV=production)",
				});
			}
			if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
				issues.push({
					variable: "APP_URL",
					message: "must not be localhost on Vercel production",
				});
			}
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
	} catch {
		issues.push({
			variable: "NEON_AUTH_BASE_URL",
			message: "must be a valid URL",
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
	return { ok: issues.length === 0, issues };
}

export function assertNeonCloudIds(input: {
	orgId?: string;
	projectId?: string;
	branchId?: string;
}): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	if (input.orgId !== undefined && input.orgId !== APPROVED_NEON_ORG_ID) {
		issues.push({
			variable: "NEON_ORG_ID",
			message: `must equal approved org ${APPROVED_NEON_ORG_ID}`,
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
			message: `must equal approved production branch ${APPROVED_NEON_BRANCH_ID} (single-branch policy)`,
		});
	}
	return { ok: issues.length === 0, issues };
}

const LOCAL_ONLY_PASSWORD_KEYS = [
	"SHARED_ADMIN_PASSWORD",
	"PREVIEW_CLIENT_PASSWORD",
	"CLIENT_DEFAULT_PASSWORD",
	"E2E_OPERATOR_PASSWORD",
	"E2E_CLIENT_PASSWORD",
] as const;

/**
 * Dev / E2E autofill secrets must not be present on Vercel production.
 * Gated on VERCEL_ENV so local `next build` with `.env.local` still works.
 */
export function assertLocalOnlySecretsAbsentInProduction(
	values: Partial<Record<(typeof LOCAL_ONLY_PASSWORD_KEYS)[number], string>>,
	ctx: NeonRuntimeContext = {},
): NeonContractResult {
	const issues: NeonContractIssue[] = [];
	if (!isProductionDeployment(ctx)) {
		return { ok: true, issues };
	}
	for (const key of LOCAL_ONLY_PASSWORD_KEYS) {
		if (values[key]) {
			issues.push({
				variable: key,
				message:
					"must be unset on Vercel production (local/E2E autofill only; never sync)",
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
			message: "must not be true on Vercel production (ARCH-027 local-only)",
		});
	}
	return { ok: issues.length === 0, issues };
}

export type NeonProductEnvInput = {
	DATABASE_URL?: string;
	NEON_AUTH_BASE_URL?: string;
	NEON_AUTH_COOKIE_SECRET?: string;
	APP_URL?: string;
	NEON_ORG_ID?: string;
	NEON_PROJECT_ID?: string;
	NEON_BRANCH_ID?: string;
	SHARED_ADMIN_PASSWORD?: string;
	PREVIEW_CLIENT_PASSWORD?: string;
	CLIENT_DEFAULT_PASSWORD?: string;
	E2E_OPERATOR_PASSWORD?: string;
	E2E_CLIENT_PASSWORD?: string;
	PLAYGROUND_ENABLED?: boolean;
};

/** Full product Neon contract — issues never include secret values. */
export function evaluateNeonProductEnv(
	input: NeonProductEnvInput,
	ctx: NeonRuntimeContext = {},
): NeonContractResult {
	const issues: NeonContractIssue[] = [];

	if (!input.DATABASE_URL) {
		issues.push({ variable: "DATABASE_URL", message: "is required" });
	} else {
		issues.push(...assertProductDatabaseUrl(input.DATABASE_URL).issues);
	}

	if (!input.NEON_AUTH_BASE_URL) {
		issues.push({ variable: "NEON_AUTH_BASE_URL", message: "is required" });
	} else {
		issues.push(...assertNeonAuthBaseUrl(input.NEON_AUTH_BASE_URL).issues);
	}

	if (!input.NEON_AUTH_COOKIE_SECRET) {
		issues.push({
			variable: "NEON_AUTH_COOKIE_SECRET",
			message: "is required",
		});
	} else {
		issues.push(...assertCookieSecret(input.NEON_AUTH_COOKIE_SECRET).issues);
	}

	if (!input.APP_URL) {
		issues.push({ variable: "APP_URL", message: "is required" });
	} else {
		issues.push(...assertAppUrl(input.APP_URL, ctx).issues);
	}

	issues.push(
		...assertNeonCloudIds({
			orgId: input.NEON_ORG_ID,
			projectId: input.NEON_PROJECT_ID,
			branchId: input.NEON_BRANCH_ID,
		}).issues,
	);

	issues.push(
		...assertLocalOnlySecretsAbsentInProduction(
			{
				SHARED_ADMIN_PASSWORD: input.SHARED_ADMIN_PASSWORD,
				PREVIEW_CLIENT_PASSWORD: input.PREVIEW_CLIENT_PASSWORD,
				CLIENT_DEFAULT_PASSWORD: input.CLIENT_DEFAULT_PASSWORD,
				E2E_OPERATOR_PASSWORD: input.E2E_OPERATOR_PASSWORD,
				E2E_CLIENT_PASSWORD: input.E2E_CLIENT_PASSWORD,
			},
			ctx,
		).issues,
	);

	issues.push(
		...assertPlaygroundLocalOnly(input.PLAYGROUND_ENABLED, ctx).issues,
	);

	return { ok: issues.length === 0, issues };
}

export function formatNeonContractIssues(issues: NeonContractIssue[]): string {
	return issues
		.map((issue) => `${issue.variable}: ${issue.message}`)
		.join("; ");
}

/** Zod schemas shared by `createEnv` (values never logged). */
export const productDatabaseUrlSchema = z
	.url()
	.refine((value) => assertProductDatabaseUrl(value).ok, {
		message:
			"DATABASE_URL must be a postgres URL on a Neon -pooler host (ARCH-023)",
	});

export const neonAuthBaseUrlSchema = z
	.url()
	.refine((value) => assertNeonAuthBaseUrl(value).ok, {
		message: "NEON_AUTH_BASE_URL must be an https URL",
	});

export const neonAuthCookieSecretSchema = z
	.string()
	.min(32, "NEON_AUTH_COOKIE_SECRET must be at least 32 characters");

export function productAppUrlSchema(ctx: NeonRuntimeContext = {}) {
	return z.url().refine((value) => assertAppUrl(value, ctx).ok, {
		message:
			"APP_URL must be a valid URL; on Vercel production it must be https and non-localhost",
	});
}

export const approvedNeonOrgIdSchema = z.literal(APPROVED_NEON_ORG_ID);
export const approvedNeonProjectIdSchema = z.literal(APPROVED_NEON_PROJECT_ID);
export const approvedNeonBranchIdSchema = z.literal(APPROVED_NEON_BRANCH_ID);
