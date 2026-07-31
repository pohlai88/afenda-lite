/**
 * @afenda/env
 * Contract: ENV-REGISTRY-TESTS
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { describe, expect, it } from "vitest";

import { createDocsEnvRegistry } from "../src/docs-registry";
import {
	LOCAL_ONLY_PRODUCT_ENV_KEYS,
	NEON_ENV_CLASSIFICATION,
} from "../src/neon-contract";
import { createProductEnvRegistry } from "../src/product-registry";
import { projectRuntimeEnv } from "../src/runtime-projection";

describe("environment registries", () => {
	it("keeps product validation exhaustive with the classification ledger", () => {
		const registry = createProductEnvRegistry({
			nodeEnv: "development",
		});

		expect(Object.isFrozen(registry)).toBe(true);
		expect(Object.keys(registry).sort()).toEqual(
			Object.keys(NEON_ENV_CLASSIFICATION).sort(),
		);
	});

	it("derives local-only keys from the classification ledger", () => {
		const expected = Object.entries(NEON_ENV_CLASSIFICATION)
			.filter(([, classification]) => classification === "local-only")
			.map(([key]) => key)
			.sort();

		expect([...LOCAL_ONLY_PRODUCT_ENV_KEYS].sort()).toEqual(expected);
	});

	it("keeps the docs registry isolated and frozen", () => {
		const registry = createDocsEnvRegistry({ nodeEnv: "development" });

		expect(Object.isFrozen(registry)).toBe(true);
		expect(Object.keys(registry).sort()).toEqual([
			"DOCS_URL",
			"GITHUB_APP_ID",
			"GITHUB_APP_PRIVATE_KEY",
		]);
	});

	it("projects only canonical registry keys from the runtime source", () => {
		const projection = projectRuntimeEnv(
			{ APP_URL: true, DATABASE_URL: true },
			{
				APP_URL: "https://www.nexuscanon.com",
				DATABASE_URL: "postgresql://example",
				UNREGISTERED_SECRET: "must-not-project",
			},
		);

		expect(Object.isFrozen(projection)).toBe(true);
		expect(projection).toEqual({
			APP_URL: "https://www.nexuscanon.com",
			DATABASE_URL: "postgresql://example",
		});
		expect("UNREGISTERED_SECRET" in projection).toBe(false);
	});
});
