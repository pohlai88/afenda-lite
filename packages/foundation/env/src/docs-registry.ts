/**
 * @afenda/env
 * Contract: ENV-DOCS-REGISTRY
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { z } from "zod";

import {
	isProductionDeployment,
	type NeonRuntimeContext,
} from "./deployment-context";

const TRAILING_DOT_PATTERN = /\.$/;
const PRIVATE_KEY_PATTERN =
	/^-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+-----END (?:RSA )?PRIVATE KEY-----$/;
const GITHUB_APP_ID_PATTERN = /^\d+$/;

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
	const normalized = hostname
		.trim()
		.toLowerCase()
		.replace(TRAILING_DOT_PATTERN, "");
	return (
		normalized === "localhost" ||
		normalized === "127.0.0.1" ||
		normalized === "::1" ||
		normalized === "[::1]"
	);
}

/** Canonical docs-site variable registry, isolated from product validation. */
export function createDocsEnvRegistry(runtimeCtx: NeonRuntimeContext) {
	const baseDocsUrlSchema = z.url().refine(isOriginUrl, {
		message:
			"DOCS_URL must be an origin without credentials, path, query, or fragment.",
	});
	const productionDeployment = isProductionDeployment(runtimeCtx);
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
		.refine((value) => PRIVATE_KEY_PATTERN.test(value), {
			message: "GITHUB_APP_PRIVATE_KEY must be a valid PEM private key.",
		});

	return Object.freeze({
		DOCS_URL: docsUrlSchema,
		GITHUB_APP_ID: z
			.string()
			.trim()
			.regex(GITHUB_APP_ID_PATTERN, {
				message: "GITHUB_APP_ID must contain digits only.",
			})
			.optional(),
		GITHUB_APP_PRIVATE_KEY: githubAppPrivateKeySchema.optional(),
	});
}
