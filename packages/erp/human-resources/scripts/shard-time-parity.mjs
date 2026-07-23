/**
 * One-shot splitter for human-resources.time.parity.test.ts → domain shards.
 * Run from repo root: node packages/erp/human-resources/scripts/shard-time-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.join(__dirname, "../__tests__");
const srcPath = path.join(testsDir, "human-resources.time.parity.test.ts");

const SHARDS = [
	{
		file: "human-resources.time.calendar.parity.test.ts",
		label: "calendar",
		fnLabel: "Calendar",
		itIndices: [0, 1, 4],
	},
	{
		file: "human-resources.time.policy.parity.test.ts",
		label: "policy",
		fnLabel: "Policy",
		itIndices: [2],
	},
	{
		file: "human-resources.time.attendance.parity.test.ts",
		label: "attendance",
		fnLabel: "Attendance",
		itIndices: [3, 5, 6, 7, 8, 12, 13],
	},
	{
		file: "human-resources.time.timesheet.parity.test.ts",
		label: "timesheet",
		fnLabel: "Timesheet",
		itIndices: [9, 10, 11],
	},
	{
		file: "human-resources.time.scheduling.parity.test.ts",
		label: "scheduling",
		fnLabel: "Scheduling",
		itIndices: [14, 15, 16],
	},
	{
		file: "human-resources.time.exceptions.parity.test.ts",
		label: "exceptions",
		fnLabel: "Exceptions",
		itIndices: [17, 18, 19],
	},
];

const src = fs.readFileSync(srcPath, "utf8");
const lines = src.split("\n");

const importEnd = lines.findIndex((l) => l.startsWith("const { hasDatabase }"));
if (importEnd < 0) {
	throw new Error("Could not locate import block end");
}

const domainImports = lines
	.slice(4, importEnd)
	.filter((line) => !line.includes("resolveDatabaseUrlForTests"))
	.join("\n");

const fnStart = lines.findIndex((l) =>
	l.startsWith("function defineTimeParitySuite"),
);
const fnEnd = lines.findIndex((l) =>
	l.startsWith('describe("human-resources.time.parity (memory)"'),
);
if (fnStart < 0 || fnEnd < 0) {
	throw new Error("Could not locate defineTimeParitySuite bounds");
}

const itStarts = [];
for (let i = fnStart; i < fnEnd; i++) {
	if (/^\tit\("/.test(lines[i])) {
		itStarts.push(i);
	}
}

function extractItBlock(index) {
	const start = itStarts[index];
	const end = index + 1 < itStarts.length ? itStarts[index + 1] : fnEnd;
	return lines.slice(start, end).join("\n");
}

for (const shard of SHARDS) {
	const fnName = `defineTime${shard.fnLabel}ParitySuite`;
	const body = shard.itIndices.map((i) => extractItBlock(i)).join("\n\n");
	const content = `/**
 * Memory vs Drizzle parity — HR Time / ${shard.label}.
 */

import { afterAll, describe, it } from "vitest";

${domainImports}
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import {
	ALL_ATTENDANCE_EXCEPTION_TYPES,
	ATTENDANCE_EXCEPTION_INVENTORY_IS_EXHAUSTIVE,
	ATTENDANCE_EXCEPTION_SEVERITY,
	runDrizzleParity,
	STANDARD_WEEK,
	uniqueSuffix,
} from "./helpers/time-parity-shared";

function ${fnName}(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = \`org-hr-time-parity-\${suffix}\`;
	const ACTOR = \`user-hr-time-parity-\${suffix}\`;
	const MANAGER = \`user-hr-time-mgr-\${suffix}\`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

${body}
}

describe("human-resources.time.${shard.label}.parity (memory)", () => {
	${fnName}("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.${shard.label}.parity (drizzle)",
	() => {
		${fnName}("drizzle");
	},
);
`;

	fs.writeFileSync(path.join(testsDir, shard.file), content);
	console.log("wrote", shard.file);
}

fs.unlinkSync(srcPath);
console.log("removed", srcPath);
