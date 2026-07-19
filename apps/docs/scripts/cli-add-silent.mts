/**
 * Non-interactive Fumadocs CLI component install (auto-override files).
 * Usage: pnpm exec tsx scripts/cli-add-silent.mts <component...>
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOrLoadConfig } from "@fumadocs/cli/config";
import { FumadocsComponentInstaller } from "@fumadocs/cli/registry/installer";

const cwd = path.join(fileURLToPath(import.meta.url), "../..");
const requireFromCli = createRequire(
	path.join(cwd, "node_modules/@fumadocs/cli/package.json"),
);

const { HttpRegistryConnector } = requireFromCli(
	"fuma-cli/registry/connector",
) as {
	HttpRegistryConnector: new (dir: string) => unknown;
};

const { ComponentInstaller } = requireFromCli(
	"fuma-cli/registry/installer",
) as {
	ComponentInstaller: {
		prototype: {
			install: (
				this: unknown,
				name: string,
				subRegistry?: string,
			) => Promise<{ deps: () => Promise<DependencyManager> }>;
		};
	};
};

type DependencyManager = {
	hasRequired: () => boolean;
	writeRequired: () => Promise<void>;
	dependencies: string[];
	devDependencies: string[];
};

const UI_REGISTRY: Record<string, string> = {
	"radix-ui": "fumadocs/radix-ui",
	"base-ui": "fumadocs/base-ui",
};

/** Root-registry components (not under radix-ui / base-ui). */
const ROOT_COMPONENTS = new Set(["graph-view", "feedback", "markdown"]);

async function main() {
	const names = process.argv.slice(2).filter((n) => !n.startsWith("-"));
	if (names.length === 0) {
		console.error(
			"Usage: pnpm exec tsx scripts/cli-add-silent.mts <component...>",
		);
		process.exit(1);
	}

	process.chdir(cwd);
	const config = await createOrLoadConfig("./cli.json");
	const connector = new HttpRegistryConnector("https://fumadocs.dev/registry");
	const installer = new FumadocsComponentInstaller(
		connector as never,
		config,
		cwd,
	);
	const uiSub = UI_REGISTRY[config.uiLibrary];

	for (const name of names) {
		const subRegistry = ROOT_COMPONENTS.has(name) ? undefined : uiSub;
		process.stdout.write(`Installing ${name}… `);
		const result = await ComponentInstaller.prototype.install.call(
			installer,
			name,
			subRegistry,
		);
		const deps = (await result.deps()) as DependencyManager;
		if (deps.hasRequired()) {
			await deps.writeRequired();
			console.log(
				`ok (deps recorded: ${[...deps.dependencies, ...deps.devDependencies].join(", ")})`,
			);
		} else {
			console.log("ok");
		}
	}
}

main().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
