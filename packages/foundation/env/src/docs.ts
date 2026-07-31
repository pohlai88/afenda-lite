/**
 * @afenda/env
 * Contract: ENV-DOCS
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { createDocsEnvRegistry } from "./docs-registry";
import { projectRuntimeEnv } from "./runtime-projection";

const runtimeCtx = {
	nodeEnv: process.env.NODE_ENV,
	vercelEnv: process.env.VERCEL_ENV,
} as const;

const docsEnvRegistry = createDocsEnvRegistry(runtimeCtx);

/**
 * Typed environment contract for `@afenda/docs`.
 *
 * Import through:
 *
 * `import { docsEnv } from "@afenda/env/docs"`
 *
 * The dedicated `/docs` export must not load or validate the product/web
 * environment schema.
 *
 * GitHub App credentials are optional as a complete pair so the docs site can
 * build and run without feedback integration. A partially configured GitHub
 * App is rejected because it can never service feedback submissions.
 *
 * `DOCS_URL` defaults to the local docs origin outside production. Production
 * deployments must provide an explicit HTTPS origin.
 */
export const docsEnv = createEnv({
	server: docsEnvRegistry,
	client: {},
	runtimeEnv: projectRuntimeEnv(docsEnvRegistry, process.env),
	emptyStringAsUndefined: true,
	createFinalSchema: (shape) =>
		z.object(shape).superRefine((value, ctx) => {
			const hasGitHubAppId = value.GITHUB_APP_ID !== undefined;
			const hasGitHubPrivateKey = value.GITHUB_APP_PRIVATE_KEY !== undefined;

			if (hasGitHubAppId !== hasGitHubPrivateKey) {
				ctx.addIssue({
					code: "custom",
					path: [hasGitHubAppId ? "GITHUB_APP_PRIVATE_KEY" : "GITHUB_APP_ID"],
					message:
						"GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be configured together.",
				});
			}
		}),
});
