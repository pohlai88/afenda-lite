import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed Next.js env for `@afenda/docs` (site origin + GitHub App → Discussions feedback).
 * SSOT: docs-V2/docs/feedback.md · rss.md · og-next.md · deploying.md
 * `import { docsEnv } from '@afenda/env/docs'` — never raw process.env.
 * Use the `/docs` subpath so importing docs env does not load the web Neon schema.
 * Commits last-edit token keys Outside baseline — docs-V2/docs/git-last-edit.md
 *
 * Feedback keys are optional at boot so the docs app can build/dev without credentials;
 * server actions throw when credentials are missing at submit time (honest failure).
 * `DOCS_URL` defaults to local docs port; set the public origin on the docs Vercel project
 * (metadataBase · RSS absolute links · OG).
 */
export const docsEnv = createEnv({
	server: {
		DOCS_URL: z.url().default("http://localhost:3001"),
		GITHUB_APP_ID: z.string().min(1).optional(),
		GITHUB_APP_PRIVATE_KEY: z
			.string()
			.min(1)
			.transform((value) => value.replace(/\\n/g, "\n"))
			.optional(),
	},
	client: {},
	runtimeEnv: {
		DOCS_URL: process.env.DOCS_URL,
		GITHUB_APP_ID: process.env.GITHUB_APP_ID,
		GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
	},
	emptyStringAsUndefined: true,
});
