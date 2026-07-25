import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SHADOW =
	/ca_shareholding|ca_share_allotment|ca_bank_account[^_]|ca_group_link|ca_statutory_filing|ca_beneficial_owner[^_]|ca_import_batch/;

const ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);

describe("corporate-administration anti-shadow boundary", () => {
	it("has zero product hits for forbidden shadow table names", () => {
		let output = "";
		try {
			output = execFileSync(
				"git",
				[
					"grep",
					"--name-only",
					"--extended-regexp",
					SHADOW.source,
					"--",
					"packages/**/*.ts",
					"packages/**/*.tsx",
					"packages/**/*.sql",
					"apps/**/*.ts",
					"apps/**/*.tsx",
					":(exclude)**/__tests__/**",
					":(exclude)**/shadcn-studio/**",
				],
				{ cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
			);
		} catch (error) {
			const status =
				typeof error === "object" && error !== null && "status" in error
					? error.status
					: null;
			if (status !== 1) throw error;
		}
		const hits = output.trim() ? output.trim().split(/\r?\n/) : [];
		expect(hits).toEqual([]);
	});
});
