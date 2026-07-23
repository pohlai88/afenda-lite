import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../__tests__",
);

for (const file of fs.readdirSync(testsDir)) {
	if (!file.match(/^human-resources\.time\..+\.parity\.test\.ts$/)) {
		continue;
	}
	const filePath = path.join(testsDir, file);
	const content = fs.readFileSync(filePath, "utf8");
	const fixed = content.replace(
		/^import \{ afterAll, describe, it \} from "vitest";\r?\n\r?\n/m,
		"",
	);
	if (fixed !== content) {
		fs.writeFileSync(filePath, fixed);
		console.log("fixed", file);
	}
}
