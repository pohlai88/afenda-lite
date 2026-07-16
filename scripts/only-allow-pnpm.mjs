/**
 * Fail install when invoked via npm/yarn. Pin is packageManager + Corepack.
 */
const ua = process.env.npm_config_user_agent ?? "";
if (!ua.includes("pnpm")) {
	console.error(
		[
			"This repository uses pnpm only.",
			"Enable Corepack and install with:",
			"  corepack enable",
			"  pnpm install",
			`Detected user-agent: ${ua || "(empty)"}`,
		].join("\n"),
	);
	process.exit(1);
}
