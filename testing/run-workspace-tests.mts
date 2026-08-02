import { spawnSync } from "node:child_process";

import { testingPolicy } from "@afenda/testing";

const AFFECTED_FLAG = "--affected";
const requestedArguments = process.argv.slice(2);
const unsupportedArguments = requestedArguments.filter(
	(argument) => argument !== AFFECTED_FLAG,
);

if (unsupportedArguments.length > 0) {
	throw new Error(
		`Unsupported workspace test arguments: ${unsupportedArguments.join(", ")}`,
	);
}

const packageManagerCli = process.env.npm_execpath;
if (!packageManagerCli) {
	throw new Error(
		"Workspace tests must be started through pnpm so the package-manager runtime is available.",
	);
}

const command = testingPolicy.workspaceRun({
	affected: requestedArguments.includes(AFFECTED_FLAG),
});
const result = spawnSync(
	process.execPath,
	[packageManagerCli, "exec", command.executable, ...command.args],
	{
		stdio: "inherit",
	},
);

if (result.error) {
	throw result.error;
}

process.exitCode = result.status ?? 1;
