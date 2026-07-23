import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src",
);

const FORBIDDEN =
	/correlationId:\s*HUMAN_RESOURCES_COMMAND_[A-Z0-9_]+/;

function walkTsFiles(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = path.join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			if (name === "node_modules") continue;
			walkTsFiles(full, out);
			continue;
		}
		if (!name.endsWith(".ts")) continue;
		if (name === "module-ids.ts") continue;
		out.push(full);
	}
	return out;
}

describe("correlation id static guard", () => {
	it("never passes HUMAN_RESOURCES_COMMAND_* as correlationId", () => {
		const offenders: string[] = [];
		for (const file of walkTsFiles(srcRoot)) {
			const text = readFileSync(file, "utf8");
			if (FORBIDDEN.test(text)) {
				offenders.push(path.relative(srcRoot, file));
			}
		}
		expect(offenders).toEqual([]);
	});
});
