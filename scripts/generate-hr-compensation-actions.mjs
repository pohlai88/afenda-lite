import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_RELATIVE_PATH = "apps/web/app/actions/hr-compensation.ts";
const OUTPUT_PATH = path.join(root, OUTPUT_RELATIVE_PATH);
const BIOME_BIN_PATH = path.join(
	root,
	"node_modules",
	"@biomejs",
	"biome",
	"bin",
	"biome",
);

const actions = [
	[
		"createCompensationGrade",
		"createCompensationGradeActionSchema",
		"COMPENSATION_MANAGE",
		"Could not create compensation grade.",
		"Enter a valid compensation grade.",
		"grade",
		"CompensationGrade",
	],
	[
		"updateCompensationGrade",
		"updateCompensationGradeActionSchema",
		"COMPENSATION_MANAGE",
		"Could not update compensation grade.",
		"Enter a valid compensation grade update.",
		"grade",
		"CompensationGrade",
	],
	[
		"archiveCompensationGrade",
		"archiveCompensationGradeActionSchema",
		"COMPENSATION_MANAGE",
		"Could not archive compensation grade.",
		"Enter a valid grade archive request.",
		"grade",
		"CompensationGrade",
	],
	[
		"getCompensationGrade",
		"getCompensationGradeActionSchema",
		"COMPENSATION_READ",
		"Could not get compensation grade.",
		"Enter a valid grade lookup.",
		"grade",
		"CompensationGrade | null",
	],
	[
		"listCompensationGrades",
		"listCompensationGradesActionSchema",
		"COMPENSATION_READ",
		"Could not list compensation grades.",
		"Enter valid grade list filters.",
		"page",
		"CompensationGradeListPage",
	],
	[
		"createSalaryBand",
		"createSalaryBandActionSchema",
		"COMPENSATION_MANAGE",
		"Could not create salary band.",
		"Enter a valid salary band.",
		"band",
		"SalaryBand",
	],
	[
		"supersedeSalaryBand",
		"supersedeSalaryBandActionSchema",
		"COMPENSATION_MANAGE",
		"Could not supersede salary band.",
		"Enter a valid salary band supersede request.",
		"band",
		"SalaryBand",
	],
	[
		"archiveSalaryBand",
		"archiveSalaryBandActionSchema",
		"COMPENSATION_MANAGE",
		"Could not archive salary band.",
		"Enter a valid salary band archive request.",
		"band",
		"SalaryBand",
	],
	[
		"getSalaryBand",
		"getSalaryBandActionSchema",
		"COMPENSATION_READ",
		"Could not get salary band.",
		"Enter a valid salary band lookup.",
		"band",
		"SalaryBand | null",
	],
	[
		"listSalaryBandsByGrade",
		"listSalaryBandsByGradeActionSchema",
		"COMPENSATION_READ",
		"Could not list salary bands.",
		"Enter valid salary band list filters.",
		"page",
		"SalaryBandListPage",
	],
	[
		"findSalaryBandByGradeAndCurrencyAsOf",
		"findSalaryBandByGradeAndCurrencyAsOfActionSchema",
		"COMPENSATION_READ",
		"Could not find salary band as of date.",
		"Enter a valid salary band as-of lookup.",
		"band",
		"SalaryBand",
	],
	[
		"createCompensationGradeProgressionRule",
		"createCompensationGradeProgressionRuleActionSchema",
		"COMPENSATION_MANAGE",
		"Could not create grade progression rule.",
		"Enter a valid grade progression rule.",
		"rule",
		"CompensationGradeProgressionRule",
	],
	[
		"archiveCompensationGradeProgressionRule",
		"archiveCompensationGradeProgressionRuleActionSchema",
		"COMPENSATION_MANAGE",
		"Could not archive grade progression rule.",
		"Enter a valid progression rule archive request.",
		"rule",
		"CompensationGradeProgressionRule",
	],
	[
		"getCompensationGradeProgressionRule",
		"getCompensationGradeProgressionRuleActionSchema",
		"COMPENSATION_READ",
		"Could not get grade progression rule.",
		"Enter a valid progression rule lookup.",
		"rule",
		"CompensationGradeProgressionRule | null",
	],
	[
		"listCompensationGradeProgressionRulesFromGrade",
		"listCompensationGradeProgressionRulesFromGradeActionSchema",
		"COMPENSATION_READ",
		"Could not list grade progression rules.",
		"Enter valid progression rule list filters.",
		"page",
		"CompensationGradeProgressionRuleListPage",
	],
	[
		"listEligibleProgressionTargets",
		"listEligibleProgressionTargetsActionSchema",
		"COMPENSATION_READ",
		"Could not list eligible progression targets.",
		"Enter valid progression target filters.",
		"targets",
		"CompensationGradeProgressionRule[]",
	],
	[
		"createEmployeeCompensation",
		"createEmployeeCompensationActionSchema",
		"COMPENSATION_MANAGE",
		"Could not create employee compensation.",
		"Enter a valid compensation record.",
		"compensation",
		"EmployeeCompensation",
	],
	[
		"amendEmployeeCompensation",
		"amendEmployeeCompensationActionSchema",
		"COMPENSATION_MANAGE",
		"Could not amend employee compensation.",
		"Enter a valid compensation amendment.",
		"compensation",
		"EmployeeCompensation",
	],
	[
		"approveEmployeeCompensation",
		"approveEmployeeCompensationActionSchema",
		"COMPENSATION_MANAGE",
		"Could not approve employee compensation.",
		"Enter a valid compensation approval.",
		"compensation",
		"EmployeeCompensation",
	],
	[
		"scheduleEmployeeCompensationChange",
		"scheduleEmployeeCompensationChangeActionSchema",
		"COMPENSATION_MANAGE",
		"Could not schedule employee compensation change.",
		"Enter a valid compensation schedule request.",
		"compensation",
		"EmployeeCompensation",
	],
	[
		"activateEmployeeCompensation",
		"activateEmployeeCompensationActionSchema",
		"COMPENSATION_MANAGE",
		"Could not activate employee compensation.",
		"Enter a valid compensation activation request.",
		"compensation",
		"EmployeeCompensation",
	],
	[
		"correctEmployeeCompensation",
		"correctEmployeeCompensationActionSchema",
		"COMPENSATION_MANAGE",
		"Could not correct employee compensation.",
		"Enter a valid compensation correction.",
		"compensation",
		"EmployeeCompensation",
	],
	[
		"endEmployeeCompensation",
		"endEmployeeCompensationActionSchema",
		"COMPENSATION_MANAGE",
		"Could not end employee compensation.",
		"Enter a valid compensation end request.",
		"compensation",
		"EmployeeCompensation",
	],
	[
		"getEmployeeCompensation",
		"getEmployeeCompensationActionSchema",
		"COMPENSATION_READ",
		"Could not get employee compensation.",
		"Enter a valid compensation lookup.",
		"compensation",
		"Partial<EmployeeCompensation>",
	],
	[
		"listEmployeeCompensationsByEmployee",
		"listEmployeeCompensationsActionSchema",
		"COMPENSATION_READ",
		"Could not list employee compensations.",
		"Enter valid compensation list filters.",
		"page",
		"EmployeeCompensationListPagePartial",
	],
	[
		"createCompensationProposal",
		"createCompensationProposalActionSchema",
		"COMPENSATION_PROPOSAL_CREATE",
		"Could not create compensation proposal.",
		"Enter a valid compensation proposal.",
		"proposal",
		"CompensationProposal",
	],
	[
		"amendCompensationProposal",
		"amendCompensationProposalActionSchema",
		"COMPENSATION_PROPOSAL_AMEND",
		"Could not amend compensation proposal.",
		"Enter a valid proposal amendment.",
		"proposal",
		"CompensationProposal",
	],
	[
		"approveCompensationProposal",
		"approveCompensationProposalActionSchema",
		"COMPENSATION_PROPOSAL_APPROVE",
		"Could not approve compensation proposal.",
		"Enter a valid proposal approval.",
		"proposal",
		"CompensationProposal",
	],
	[
		"getCompensationProposal",
		"getCompensationProposalActionSchema",
		"COMPENSATION_PROPOSAL_READ",
		"Could not get compensation proposal.",
		"Enter a valid proposal lookup.",
		"proposal",
		"CompensationProposal | null",
	],
	[
		"listCompensationProposals",
		"listCompensationProposalsActionSchema",
		"COMPENSATION_PROPOSAL_READ",
		"Could not list compensation proposals.",
		"Enter valid proposal list filters.",
		"page",
		"CompensationProposalListPage",
	],
	[
		"getApprovedCompensationHandoff",
		"getApprovedCompensationHandoffActionSchema",
		"COMPENSATION_READ",
		"Could not get approved compensation handoff.",
		"Enter a valid compensation handoff lookup.",
		"handoff",
		"ApprovedCompensationHandoff | null",
	],
];

const pkgFns = [...new Set(actions.map((a) => a[0]))].sort();
const schemaImports = [
	...new Set(actions.map((a) => a[1].replace("ActionSchema", "InputSchema"))),
].sort();
const schemaConsts = [...new Set(actions.map((a) => a[1]))]
	.map(
		(s) =>
			`const ${s} = hrActionSchema(${s.replace("ActionSchema", "InputSchema")});`,
	)
	.join("\n");

const listPagePartialType = `interface EmployeeCompensationListPagePartial {
	compensations: Partial<EmployeeCompensation>[];
	page: number;
	pageSize: number;
	totalCount: number;
}`;

const fns = actions
	.map(([pkgFn, schema, perm, safe, validation, key, type]) => {
		const actionName = `${pkgFn}Action`;
		const resultType =
			type === "EmployeeCompensationListPagePartial"
				? "{ page: EmployeeCompensationListPagePartial }"
				: `{ ${key}: ${type} }`;
		const mapParam =
			key === "page" && type === "EmployeeCompensationListPagePartial"
				? "page"
				: key;
		const tData = type;
		return `export async function ${actionName}(
	input: unknown,
): Promise<ActionResult<${resultType}>> {
	return await runHrHumanResourcesAction<${tData}, ${resultType}>({
		path: "${actionName}",
		permission: ${perm},
		safeMessage: "${safe}",
		validationMessage: "${validation}",
		actionSchema: ${schema},
		input,
		invoke: invokeHrPackage(${pkgFn}),
		mapData: (${mapParam}) => ({ ${key} }),
	});
}`;
	})
	.join("\n\n");

const rawOutput = `"use server";

import type {
	ApprovedCompensationHandoff,
	CompensationGrade,
	CompensationGradeListPage,
	CompensationGradeProgressionRule,
	CompensationGradeProgressionRuleListPage,
	CompensationProposal,
	CompensationProposalListPage,
	EmployeeCompensation,
	SalaryBand,
	SalaryBandListPage,
} from "@afenda/human-resources";
import {
	${pkgFns.join(",\n\t")},
} from "@afenda/human-resources";
import {
	${schemaImports.join(",\n\t")},
} from "@afenda/human-resources/schemas";

import {
	invokeHrPackage,
	runHrCompensationHumanResourcesAction as runHrHumanResourcesAction,
} from "@/app/actions/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

${schemaConsts}

const COMPENSATION_MANAGE = "human-resources.compensation.manage" as const;
const COMPENSATION_READ = "human-resources.compensation.read" as const;
const COMPENSATION_PROPOSAL_CREATE =
	"human-resources.compensation-proposal.create" as const;
const COMPENSATION_PROPOSAL_AMEND =
	"human-resources.compensation-proposal.amend" as const;
const COMPENSATION_PROPOSAL_APPROVE =
	"human-resources.compensation-proposal.approve" as const;
const COMPENSATION_PROPOSAL_READ =
	"human-resources.compensation-proposal.read" as const;

${listPagePartialType}

${fns}
`;

export function renderHrCompensationActions() {
	const result = spawnSync(
		process.execPath,
		[BIOME_BIN_PATH, "format", `--stdin-file-path=${OUTPUT_RELATIVE_PATH}`],
		{
			cwd: root,
			encoding: "utf8",
			input: rawOutput,
			shell: false,
		},
	);
	if (result.error) {
		throw new Error(`Biome formatter failed to start: ${result.error.message}`);
	}
	if (result.status !== 0) {
		throw new Error(
			`Biome formatter failed: ${(result.stderr || "unknown error").trim()}`,
		);
	}
	return result.stdout;
}

function main() {
	const rendered = renderHrCompensationActions();
	if (process.argv.includes("--check")) {
		const current = fs.readFileSync(OUTPUT_PATH, "utf8");
		if (current !== rendered) {
			console.error(
				`${OUTPUT_RELATIVE_PATH} is stale; run node scripts/generate-hr-compensation-actions.mjs`,
			);
			process.exitCode = 1;
			return;
		}
		console.log(`hr-compensation actions: current (${actions.length} actions)`);
		return;
	}

	fs.writeFileSync(OUTPUT_PATH, rendered);
	console.log(`wrote ${actions.length} actions`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
	main();
}
