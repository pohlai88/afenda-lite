/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const server = await createServer({
	appType: "custom",
	configFile: false,
	root: packageRoot,
	server: { middlewareMode: true },
});

try {
	const [aliasesModule, invariantsModule, registryModule] = await Promise.all([
		server.ssrLoadModule("/src/contract/aliases.ts"),
		server.ssrLoadModule("/src/contract/invariants.ts"),
		server.ssrLoadModule("/src/contract/registry.ts"),
	]);
	const { HISTORICAL_ERROR_ALIASES, RESERVED_HISTORICAL_ERROR_NAMES } =
		aliasesModule;
	const { assertErrorRegistry } = invariantsModule;
	const { CANONICAL_ERROR_CODES, ERROR_REGISTRY } = registryModule;

	Reflect.apply(assertErrorRegistry, undefined, [
		ERROR_REGISTRY,
		CANONICAL_ERROR_CODES,
		HISTORICAL_ERROR_ALIASES,
		RESERVED_HISTORICAL_ERROR_NAMES,
	]);

	if (!Object.isFrozen(ERROR_REGISTRY)) {
		throw new Error("Invalid @afenda/errors contract: registry must be frozen");
	}

	if (!Object.isFrozen(CANONICAL_ERROR_CODES)) {
		throw new Error(
			"Invalid @afenda/errors contract: canonical code projection must be frozen",
		);
	}

	console.log(
		`Canonical error contract is valid (${CANONICAL_ERROR_CODES.length} definitions, ${Object.keys(HISTORICAL_ERROR_ALIASES).length} historical aliases).`,
	);
} finally {
	await server.close();
}
