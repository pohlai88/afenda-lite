import assert from "node:assert/strict";
import {
	scriptPlacementViolation,
	shellScriptDumpViolation,
} from "../directory-local-scripts-lib.mjs";

const placement = [
	["scripts/_tmp-write.cjs", true],
	["scripts/check-readme.mjs", false],
	["scripts/check-kernel-governance.mts", true],
	["scripts/_staging/foo.ts", true],
	["governance/scripts/check-kernel-governance.mts", false],
	["docs/template/readme/generate.readme.ts", true],
	["docs/template/readme/package.readme.template.md", false],
	["scripts/lib/editor-posture.mjs", false],
];

for (const [filePath, shouldDeny] of placement) {
	const hit = scriptPlacementViolation(filePath);
	assert.equal(
		hit !== null,
		shouldDeny,
		`${filePath}: expected deny=${shouldDeny}, got ${hit}`,
	);
}

assert.ok(
	shellScriptDumpViolation('Set-Content scripts/_tmp-x.mjs "hi"'),
	"Set-Content dump must deny",
);
assert.equal(
	shellScriptDumpViolation("echo mentioning path only"),
	null,
	"mere mention must allow",
);

console.log("directory-local-scripts: ok");
