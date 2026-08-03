#!/usr/bin/env tsx
/**
 * Direct, non-interactive entrypoint for this repo's generators.
 *
 * `turbo gen <name>` hangs indefinitely on this platform (Windows + pnpm),
 * even for prompt-free generators and even with the documented `--args`
 * bypass flag — the hang is in turbo's own CLI-to-@turbo/gen subprocess
 * spawn, upstream of Plop/inquirer entirely (see vercel/turborepo#8709,
 * #8281, both unresolved). Every generator command in this repo is exposed
 * as a plain async function for exactly this reason; this script calls
 * those functions directly and skips the turbo CLI altogether.
 */
import { parseGeneratorReconciliationPlan } from "../turbo/generators/engine/reconciliation-planner.ts";
import { applyErpFeatureScaffold } from "../turbo/generators/erp-generator/feature-scaffold.ts";
import { applyErpPackageScaffold } from "../turbo/generators/erp-generator/package-scaffold.ts";
import { applyErpProjectionLocks } from "../turbo/generators/erp-generator/projection-lock-apply.ts";
import { erpGeneratorRegistration } from "../turbo/generators/erp-generator/registration.ts";
import { applyKernelAdoptionTreatments } from "../turbo/generators/kernel-generator/adoption-apply.ts";
import { kernelGeneratorRegistration } from "../turbo/generators/kernel-generator/registration.ts";

const repositoryRoot = process.cwd();

const readFlag = (args: readonly string[], flag: string): string | undefined => {
	const index = args.indexOf(flag);
	if (index === -1 || index === args.length - 1) {
		return undefined;
	}
	return args[index + 1];
};

const requireFlag = (
	args: readonly string[],
	flag: string,
	command: string,
): string => {
	const value = readFlag(args, flag);
	if (value === undefined) {
		throw new Error(`${command} requires ${flag} <value>`);
	}
	return value;
};

const parsePlan = async (
	family: "erp" | "kernel",
): Promise<ReturnType<typeof parseGeneratorReconciliationPlan>> => {
	const registration =
		family === "erp" ? erpGeneratorRegistration : kernelGeneratorRegistration;
	const planJson = await registration.planUpgrade(repositoryRoot, {
		format: "json",
	});
	return parseGeneratorReconciliationPlan(JSON.parse(planJson));
};

const commands: Record<string, (args: readonly string[]) => Promise<string>> = {
	"doctor:erp": async () => erpGeneratorRegistration.doctor(repositoryRoot),
	"doctor:kernel": async () => kernelGeneratorRegistration.doctor(repositoryRoot),
	"plan:erp": async (args) =>
		erpGeneratorRegistration.planUpgrade(repositoryRoot, {
			format: args.includes("--json") ? "json" : "text",
		}),
	"plan:kernel": async (args) =>
		kernelGeneratorRegistration.planUpgrade(repositoryRoot, {
			format: args.includes("--json") ? "json" : "text",
		}),
	"erp:create-package": async (args) => {
		const moduleId = requireFlag(args, "--module-id", "erp:create-package");
		const category = requireFlag(args, "--category", "erp:create-package");
		const result = await applyErpPackageScaffold({
			repositoryRoot,
			spec: { moduleId, category },
		});
		return `created ${result.packagePath} (${result.filesWritten.length} files)`;
	},
	"erp:add-feature": async (args) => {
		const moduleId = requireFlag(args, "--module-id", "erp:add-feature");
		const featureId = requireFlag(args, "--feature-id", "erp:add-feature");
		const groupId = readFlag(args, "--group-id");
		const result = await applyErpFeatureScaffold({
			repositoryRoot,
			spec: {
				moduleId,
				featureId,
				...(groupId === undefined ? {} : { groupId }),
			},
		});
		return `created ${result.featurePath} (${result.filesWritten.length} files)`;
	},
	"erp:reconcile-projection-locks": async () => {
		const plan = await parsePlan("erp");
		const result = await applyErpProjectionLocks({ repositoryRoot, plan });
		return `reconciled projection locks: written=${result.filesWritten.length} skipped=${result.skipped.length}`;
	},
	"kernel:apply-adoption": async () => {
		const plan = await parsePlan("kernel");
		const result = await applyKernelAdoptionTreatments({ repositoryRoot, plan });
		return `applied kernel adoption: changed=${result.filesChanged.length} skipped=${result.skipped.length}`;
	},
};

const [command, ...rest] = process.argv.slice(2);
const handler = command === undefined ? undefined : commands[command];
if (handler === undefined) {
	console.error(
		`usage: tsx scripts/gen-cli.ts <${Object.keys(commands).join("|")}> [flags]`,
	);
	process.exit(1);
}

const output = await handler(rest);
console.log(output);
