/**
 * @afenda/env
 * Contract: ENV-EXPORTS-CONTRACT
 * Protected: changes require local pre-edit token and compatibility checks.
 *
 * Public entrypoint: `@afenda/env/contract`.
 *
 * Pure environment-contract evaluators for validation scripts and tests. This
 * entrypoint must never initialize the product or docs runtime schema —
 * importing it reads no environment and can never fail on absent variables.
 * Enforced by `__tests__/import-isolation.test.ts`.
 */

export {
	classifyDeployment,
	type DeploymentClass,
	isProductionDeployment,
	isVercelRuntime,
	type NeonRuntimeContext,
} from "./deployment-context";
export {
	APPROVED_APP_HOSTS,
	assertAppUrl,
	assertCookieSecret,
	assertLocalOnlyConfigAbsentInProduction,
	assertNeonAuthBaseUrl,
	assertNeonCloudIds,
	assertPairedSecretConfig,
	assertPlaygroundLocalOnly,
	assertProductDatabaseUrl,
	evaluateNeonProductEnv,
	evaluateProdBranchBaselineMigratePosture,
	formatNeonContractIssues,
	isApprovedAppHost,
	isNeonPoolerDatabaseUrl,
	LEGACY_VERCEL_APP_HOST,
	LOCAL_ONLY_PRODUCT_ENV_KEYS,
	type LocalOnlyProductEnvKey,
	NEON_ENV_CLASSIFICATION,
	type NeonContractIssue,
	type NeonContractResult,
	type NeonEnvClass,
	type NeonProductEnvInput,
	PRODUCTION_APP_HOST,
	PRODUCTION_APP_ORIGIN,
	PRODUCTION_BASELINE_MIGRATE_PROHIBITED,
	type ProdBranchMigratePostureResult,
	redactEnvValue,
} from "./neon-contract";
export {
	APPROVED_NEON_BRANCH_ID,
	APPROVED_NEON_ORG_ID,
	APPROVED_NEON_PROJECT_ID,
} from "./neon-identity";
