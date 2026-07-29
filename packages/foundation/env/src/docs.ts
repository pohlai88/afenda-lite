/**
 * @afenda/env
 * Contract: ENV-DOCS
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { isProductionDeployment } from "./neon-contract";

const runtimeCtx = {
	nodeEnv: process.env.NODE_ENV,
	vercelEnv: process.env.VERCEL_ENV,
} as const;

const productionDeployment = isProductionDeployment(runtimeCtx);

function isOriginUrl(value: string): boolean {
	const url = new URL(value);
	return (
		url.username === "" &&
		url.password === "" &&
		(url.pathname === "" || url.pathname === "/") &&
		url.search === "" &&
		url.hash === ""
	);
}

function isLocalHostname(hostname: string): boolean {
	const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
	return (
		normalized === "localhost" ||
		normalized === "127.0.0.1" ||
		normalized === "::1" ||
		normalized === "[::1]"
	);
}

const baseDocsUrlSchema = z.url().refine(isOriginUrl, {
	message:
		"DOCS_URL must be an origin without credentials, path, query, or fragment.",
});

const docsUrlSchema = productionDeployment
	? baseDocsUrlSchema
			.refine((value) => new URL(value).protocol === "https:", {
				message: "DOCS_URL must use https: in production.",
			})
			.refine((value) => !isLocalHostname(new URL(value).hostname), {
				message: "DOCS_URL must not use a local hostname in production.",
			})
	: baseDocsUrlSchema.default("http://localhost:3001");

const githubAppPrivateKeySchema = z
	.string()
	.trim()
	.min(1)
	.transform((value) => value.replace(/\\n/g, "\n"))
	.refine(
		(value) =>
			/^-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+-----END (?:RSA )?PRIVATE KEY-----$/.test(
				value,
			),
		{
			message: "GITHUB_APP_PRIVATE_KEY must be a valid PEM private key.",
		},
	);

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
	server: {
		DOCS_URL: docsUrlSchema,
		GITHUB_APP_ID: z
			.string()
			.trim()
			.regex(/^\d+$/, {
				message: "GITHUB_APP_ID must contain digits only.",
			})
			.optional(),
		GITHUB_APP_PRIVATE_KEY: githubAppPrivateKeySchema.optional(),
	},
	client: {},
	runtimeEnv: {
		DOCS_URL: process.env.DOCS_URL,
		GITHUB_APP_ID: process.env.GITHUB_APP_ID,
		GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
	},
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
