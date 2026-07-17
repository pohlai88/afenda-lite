import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Neon HTTP SQL tagged-template client (Playwright factory only). */
export type NeonSql = (
	strings: TemplateStringsArray,
	...values: unknown[]
) => Promise<unknown>;

/** Load `@neondatabase/serverless` from the db package (workspace install root). */
export async function createNeonSql(databaseUrl: string): Promise<NeonSql> {
	const modulePath = resolve(
		process.cwd(),
		"packages/db/node_modules/@neondatabase/serverless/index.mjs",
	);
	const { neon } = (await import(pathToFileURL(modulePath).href)) as {
		neon: (url: string) => NeonSql;
	};
	return neon(databaseUrl);
}
