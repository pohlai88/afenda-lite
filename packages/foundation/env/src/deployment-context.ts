/**
 * @afenda/env
 * Contract: ENV-DEPLOYMENT-CONTEXT
 * Protected: changes require local pre-edit token and compatibility checks.
 *
 * Canonical deployment classification — the single semantic owner of the
 * question "what environment is this?".
 *
 * Product and docs registries each apply their own policy to the answer, but
 * neither re-derives it. Two independent detection algorithms can agree today
 * and diverge silently later; one classifier cannot.
 *
 * This module reads no environment of its own — callers pass the context in,
 * so it stays pure and safe to load from any entrypoint.
 */

export type NeonRuntimeContext = Readonly<{
	nodeEnv?: string | undefined;
	vercelEnv?: string | undefined;
}>;

/**
 * Deployment classes.
 *
 * `local` covers local development and local production-mode builds, where
 * `VERCEL_ENV` is absent. `unknown` is an unrecognized `VERCEL_ENV` outside
 * production mode — treated as non-production by every policy below.
 */
export type DeploymentClass =
	| "local"
	| "vercel-development"
	| "preview"
	| "production"
	| "unknown";

/**
 * Classify the current deployment.
 *
 * Recognized Vercel environments are authoritative. Local `next build` also
 * runs with NODE_ENV=production, so a missing `VERCEL_ENV` is a local
 * production-mode build rather than a production deployment. Unexpected Vercel
 * values still fail closed when NODE_ENV is production.
 */
export function classifyDeployment(
	ctx: NeonRuntimeContext = {},
): DeploymentClass {
	switch (ctx.vercelEnv) {
		case "production":
			return "production";
		case "preview":
			return "preview";
		case "development":
			return "vercel-development";
		case undefined:
		case "":
			return "local";
		default:
			return ctx.nodeEnv === "production" ? "production" : "unknown";
	}
}

/** True when the current process is a production deployment. */
export function isProductionDeployment(ctx: NeonRuntimeContext = {}): boolean {
	return classifyDeployment(ctx) === "production";
}

/**
 * Any Vercel runtime where platform-issued identity such as AI Gateway OIDC
 * may be available.
 *
 * Deliberately keyed to the recognized `VERCEL_ENV` values rather than to
 * `classifyDeployment`: an unrecognized `VERCEL_ENV` under NODE_ENV=production
 * classifies as `production` (fail-closed for product policy) but is not a
 * known Vercel runtime, so platform-issued identity must not be assumed.
 */
export function isVercelRuntime(ctx: NeonRuntimeContext = {}): boolean {
	return (
		ctx.vercelEnv === "production" ||
		ctx.vercelEnv === "preview" ||
		ctx.vercelEnv === "development"
	);
}
